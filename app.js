import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import UserRouter from "./routes/user.route.js";
import ChatRouter from "./routes/chat.route.js";
import ContactRouter from "./routes/contact.route.js";
import Message from "./models/chatMessage.model.js";
import chatMessageModel from "./models/chatMessage.model.js";
import chatRoomModel from "./models/chatRoom.model.js";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// ✅ Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000","https://skillhub-mern-project-backend.onrender.com"], // React frontend port
    credentials: true,
  },
});

// ✅ Online users map
let connectedUsers = new Map();

const addConnectedUser = (userId, socketId) => {
  connectedUsers.set(userId, socketId);
  console.log(`👤 User ${userId} connected with socket ${socketId}`);
  console.log(`📊 Total connected users: ${connectedUsers.size}`);
};

const removeConnectedUser = (socketId) => {
  for (let [userId, id] of connectedUsers.entries()) {
    if (id === socketId) {
      connectedUsers.delete(userId);
      console.log(`👤 User ${userId} disconnected from socket ${socketId}`);
      break;
    }
  }
  console.log(`📊 Total connected users: ${connectedUsers.size}`);
};

const getSocketIdByUserId = (userId) => {
  return connectedUsers.get(userId);
};

const getUserBySocketId = (socketId) => {
  for (let [userId, id] of connectedUsers.entries()) {
    if (id === socketId) {
      return userId;
    }
  }
  return null;
};

// ✅ Socket Events
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // Join chat room
  socket.on("joinRoom", async ({ roomId, userId }) => {
    try {
      addConnectedUser(userId, socket.id);
      socket.join(roomId);
      console.log(`✅ User ${userId} joined room ${roomId}`);
      
      // Confirm room join to client
      socket.emit("roomJoined", { roomId, userId });

      // Find or create chat room in database
      let chatRoom = await chatRoomModel.findOne({
        roomId: roomId
      });

      if (!chatRoom) {
        // Extract participant IDs from roomId
        const participantIds = roomId.split("_");
        chatRoom = new chatRoomModel({
          participants: participantIds,
          roomId: roomId,
          createdAt: new Date()
        });
        await chatRoom.save();
        console.log("📨 Chat room created for:", roomId);
      }

      // Fetch old messages from DB using chatRoom ObjectId
      const oldMessages = await chatMessageModel.find({ chatRoom: chatRoom._id })
        .sort({ createdAt: 1 }); // Limit to last 50 messages

      console.log(`📚 Found ${oldMessages.length} old messages for room ${roomId}`);

      // Send chat history to this user
      socket.emit("chatHistory", oldMessages);
      
      // Notify others in the room that user joined (optional)
      socket.to(roomId).emit("userJoinedRoom", { 
        userId, 
        timestamp: new Date() 
      });
      
    } catch (err) {
      console.error("❌ Error joining room:", err);
      socket.emit("joinRoomError", { 
        error: "Failed to join room",
        roomId,
        details: err.message 
      });
    }
  });

  // Send Message
  socket.on("sendMessage", async (data) => {
    try {
      console.log("📨 Received message data:", data);
      
      const { sender, receiver, message, senderName } = data;
      
      if (!sender || !receiver || !message) {
        console.error("❌ Invalid message data:", data);
        socket.emit("messageError", { error: "Missing required fields" });
        return;
      }
      
      const chatRoomId = [sender, receiver].sort().join("_");
      console.log("📨 Looking for chat room:", chatRoomId);

      // Find or create chat room
      let chatRoom = await chatRoomModel.findOne({
        $or: [
          { participants: [sender, receiver] },
          { participants: [receiver, sender] }
        ]
      });

      if (!chatRoom) {
        console.log("📨 Creating new chat room");
        chatRoom = new chatRoomModel({
          participants: [sender, receiver],
          roomId: chatRoomId,
          createdAt: new Date()
        });
        await chatRoom.save();
        console.log("📨 Chat room created with ID:", chatRoom._id);
      }

      // Create message with chatRoom ObjectId
      const newMessage = new Message({
        chatRoom: chatRoom._id, // Use ObjectId instead of string
        sender,
        receiver,
        message: message.trim(),
        senderName: senderName || "Unknown"
      });

      const savedMessage = await newMessage.save();
      console.log(`💾 Message saved with ID: ${savedMessage._id}`);

      // Send message to all users in the room (sender + receiver)
      io.to(chatRoomId).emit("receiveMessage", {
        _id: savedMessage._id,
        chatRoom: savedMessage.chatRoom,
        sender: savedMessage.sender,
        receiver: savedMessage.receiver,
        message: savedMessage.message,
        senderName: savedMessage.senderName,
        createdAt: savedMessage.createdAt,
        timestamp: savedMessage.createdAt
      });

      console.log(`📤 Message broadcasted to room: ${chatRoomId}`);
      
      // Acknowledge to sender
      socket.emit("messageSent", { 
        messageId: savedMessage._id,
        success: true 
      });
      
    } catch (err) {
      console.error("❌ Error saving message:", err);
      socket.emit("messageError", { 
        error: "Failed to save message",
        details: err.message 
      });
    }
  });

  // Video Call Events
  
  // Start video call
  socket.on("startVideoCall", ({ to, from, fromName, offer, roomId }) => {
    const receiverSocketId = getSocketIdByUserId(to);
    console.log(`📞 Video call from ${from} (${fromName}) to ${to}`);
    
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("incomingVideoCall", {
        from,
        fromName,
        offer,
        roomId
      });
      console.log(`📞 Video call notification sent to ${to}`);
    } else {
      // User is offline
      socket.emit("userOffline", { userId: to });
      console.log(`❌ User ${to} is offline`);
    }
  });

  // Accept video call
  socket.on("acceptVideoCall", ({ to, from, answer, roomId }) => {
    const callerSocketId = getSocketIdByUserId(to);
    console.log(`✅ Video call accepted by ${from} for ${to}`);
    
    if (callerSocketId) {
      socket.to(callerSocketId).emit("videoCallAccepted", {
        from,
        answer
      });
      console.log(`✅ Video call acceptance sent to ${to}`);
    }
  });

  // Decline video call
  socket.on("declineVideoCall", ({ to, from, roomId }) => {
    const callerSocketId = getSocketIdByUserId(to);
    console.log(`❌ Video call declined by ${from} for ${to}`);
    
    if (callerSocketId) {
      socket.to(callerSocketId).emit("videoCallDeclined", {
        from
      });
      console.log(`❌ Video call decline sent to ${to}`);
    }
  });

  // End video call
  socket.on("endVideoCall", ({ to, from, roomId }) => {
    const otherUserSocketId = getSocketIdByUserId(to);
    console.log(`📴 Video call ended by ${from} for ${to}`);
    
    if (otherUserSocketId) {
      socket.to(otherUserSocketId).emit("videoCallEnded", {
        from
      });
      console.log(`📴 Video call end notification sent to ${to}`);
    }
  });

  // ICE Candidate exchange
  socket.on("iceCandidate", ({ candidate, to, roomId }) => {
    const receiverSocketId = getSocketIdByUserId(to);
    const senderUserId = getUserBySocketId(socket.id);
    
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("iceCandidate", {
        candidate,
        from: senderUserId
      });
      console.log(`🧊 ICE candidate sent from ${senderUserId} to ${to}`);
    }
  });

  // Handle user going offline during call
  socket.on("disconnect", () => {
    const userId = getUserBySocketId(socket.id);
    
    if (userId) {
      // Notify all connected users that this user is offline
      socket.broadcast.emit("userOffline", { userId });
      
      // If user was in a call, end it for the other party
      socket.broadcast.emit("videoCallEnded", { from: userId });
    }
    
    removeConnectedUser(socket.id);
    console.log("❌ User disconnected:", socket.id);
  });

  // Handle connection errors
  socket.on("connect_error", (error) => {
    console.error("❌ Connection error:", error);
  });

  // Ping-pong for connection health
  socket.on("ping", () => {
    socket.emit("pong");
  });
});

// ✅ Database + Server
mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 60000,
  })
  .then(() => {
    console.log("✅ Database Connected Successfully..");

    // Middlewares
    app.use(express.json({ limit: "100mb" }));
    app.use(cookieParser());
    app.use(cors({ origin: "https://skillhub-mern-project-frontend.onrender.com", credentials: true }));

    // Routes
    app.use("/user", UserRouter);
    app.use("/chat", ChatRouter);
    app.use("/contact", ContactRouter);

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ 
        status: "OK", 
        connectedUsers: connectedUsers.size,
        timestamp: new Date().toISOString()
      });
    });

    // Start Server
    httpServer.listen(process.env.PORT, () => {
      console.log(`🚀 Server & Socket.IO running on port ${process.env.PORT}`);
      console.log(`📡 Socket.IO CORS origin: https://skillhub-mern-project-backend.onrender.com`);
    });
  })
  .catch((err) => {
    console.log("❌ Database Connection failed...", err);
  });

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

export { io, connectedUsers, getSocketIdByUserId };





















// import express from "express";
// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import { createServer } from "http";
// import { Server } from "socket.io";

// import UserRouter from "./routes/user.route.js";
// import ChatRouter from "./routes/chat.route.js";
// import ContactRouter from "./routes/contact.route.js";
// import Message from "./models/chatMessage.model.js";
// import chatMessageModel from "./models/chatMessage.model.js";
// import chatRoomModel from "./models/chatRoom.model.js";

// dotenv.config();
// const app = express();
// const httpServer = createServer(app);

// // ✅ Socket.io setup
// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://localhost:3000", // React frontend port
//     credentials: true,
//   },
// });

// // ✅ Online users map
// let connectedUsers = new Map();

// const addConnectedUser = (userId, socketId) => {
//   connectedUsers.set(userId, socketId);
//   console.log(`👤 User ${userId} connected with socket ${socketId}`);
//   console.log(`📊 Total connected users: ${connectedUsers.size}`);
// };

// const removeConnectedUser = (socketId) => {
//   for (let [userId, id] of connectedUsers.entries()) {
//     if (id === socketId) {
//       connectedUsers.delete(userId);
//       console.log(`👤 User ${userId} disconnected from socket ${socketId}`);
//       break;
//     }
//   }
//   console.log(`📊 Total connected users: ${connectedUsers.size}`);
// };

// const getSocketIdByUserId = (userId) => {
//   return connectedUsers.get(userId);
// };

// const getUserBySocketId = (socketId) => {
//   for (let [userId, id] of connectedUsers.entries()) {
//     if (id === socketId) {
//       return userId;
//     }
//   }
//   return null;
// };

// // ✅ Helper function to get or create chat room (FIXED)
// const getOrCreateChatRoom = async (roomId) => {
//   try {
//     // Check if room already exists
//     let chatRoom = await chatRoomModel.findOne({ roomId: roomId });
    
//     if (!chatRoom) {
//       // Create new room only if it doesn't exist
//       const participantIds = roomId.split("_");
//       chatRoom = new chatRoomModel({
//         participants: participantIds,
//         roomId: roomId,
//         createdAt: new Date()
//       });
//       await chatRoom.save();
//       console.log("📨 NEW Chat room created with ID:", chatRoom._id);
//     } else {
//       console.log("📨 Using existing chat room with ID:", chatRoom._id);
//     }
    
//     return chatRoom;
//   } catch (error) {
//     console.error("❌ Error in getOrCreateChatRoom:", error);
//     throw error;
//   }
// };

// // ✅ Socket Events
// io.on("connection", (socket) => {
//   console.log("⚡ User connected:", socket.id);

//   // Join chat room (FIXED)
//   socket.on("joinRoom", async ({ roomId, userId }) => {
//     try {
//       addConnectedUser(userId, socket.id);
//       socket.join(roomId);
//       console.log(`✅ User ${userId} joined room ${roomId}`);
      
//       // Confirm room join to client
//       socket.emit("roomJoined", { roomId, userId });

//       // Get or create chat room (prevents duplicates)
//       const chatRoom = await getOrCreateChatRoom(roomId);

//       // Debug: Log room details
//       console.log(`🔍 DEBUG: Room ObjectId for ${roomId}: ${chatRoom._id}`);

//       // Fetch old messages from DB using chatRoom ObjectId
//       const oldMessages = await chatMessageModel.find({ chatRoom: chatRoom._id })
//         .sort({ createdAt: 1 });

//       console.log(`📚 Found ${oldMessages.length} old messages for room ${roomId}`);
      
//       if (oldMessages.length > 0) {
//         console.log(`🔍 DEBUG: First message ID: ${oldMessages[0]._id}`);
//         console.log(`🔍 DEBUG: Last message ID: ${oldMessages[oldMessages.length - 1]._id}`);
//       }

//       // Send chat history to this user
//       socket.emit("chatHistory", oldMessages);
      
//       // Notify others in the room that user joined (optional)
//       socket.to(roomId).emit("userJoinedRoom", { 
//         userId, 
//         timestamp: new Date() 
//       });
      
//     } catch (err) {
//       console.error("❌ Error joining room:", err);
//       socket.emit("joinRoomError", { 
//         error: "Failed to join room",
//         roomId,
//         details: err.message 
//       });
//     }
//   });

//   // Send Message (FIXED)
//   socket.on("sendMessage", async (data) => {
//     try {
//       console.log("📨 Received message data:", data);
      
//       const { sender, receiver, message, senderName } = data;
      
//       if (!sender || !receiver || !message) {
//         console.error("❌ Invalid message data:", data);
//         socket.emit("messageError", { error: "Missing required fields" });
//         return;
//       }
      
//       const chatRoomId = [sender, receiver].sort().join("_");
//       console.log("📨 Message for chat room:", chatRoomId);

//       // Use the same helper function to ensure consistency
//       const chatRoom = await getOrCreateChatRoom(chatRoomId);

//       console.log(`🔍 DEBUG: Saving message to room ObjectId: ${chatRoom._id}`);

//       // Create message with chatRoom ObjectId
//       const newMessage = new Message({
//         chatRoom: chatRoom._id, // Use ObjectId instead of string
//         sender,
//         receiver,
//         message: message.trim(),
//         senderName: senderName || "Unknown"
//       });

//       const savedMessage = await newMessage.save();
//       console.log(`💾 Message saved with ID: ${savedMessage._id} in room: ${savedMessage.chatRoom}`);

//       // Verify the message count after saving
//       const totalMessages = await chatMessageModel.countDocuments({ chatRoom: chatRoom._id });
//       console.log(`🔍 DEBUG: Total messages in room ${chatRoom._id}: ${totalMessages}`);

//       // Send message to all users in the room (sender + receiver)
//       io.to(chatRoomId).emit("receiveMessage", {
//         _id: savedMessage._id,
//         chatRoom: savedMessage.chatRoom,
//         sender: savedMessage.sender,
//         receiver: savedMessage.receiver,
//         message: savedMessage.message,
//         senderName: savedMessage.senderName,
//         createdAt: savedMessage.createdAt,
//         timestamp: savedMessage.createdAt
//       });

//       console.log(`📤 Message broadcasted to room: ${chatRoomId}`);
      
//       // Acknowledge to sender
//       socket.emit("messageSent", { 
//         messageId: savedMessage._id,
//         success: true 
//       });
      
//     } catch (err) {
//       console.error("❌ Error saving message:", err);
//       socket.emit("messageError", { 
//         error: "Failed to save message",
//         details: err.message 
//       });
//     }
//   });

//   // Video Call Events
  
//   // Start video call
//   socket.on("startVideoCall", ({ to, from, fromName, offer, roomId }) => {
//     const receiverSocketId = getSocketIdByUserId(to);
//     console.log(`📞 Video call from ${from} (${fromName}) to ${to}`);
    
//     if (receiverSocketId) {
//       socket.to(receiverSocketId).emit("incomingVideoCall", {
//         from,
//         fromName,
//         offer,
//         roomId
//       });
//       console.log(`📞 Video call notification sent to ${to}`);
//     } else {
//       // User is offline
//       socket.emit("userOffline", { userId: to });
//       console.log(`❌ User ${to} is offline`);
//     }
//   });

//   // Accept video call
//   socket.on("acceptVideoCall", ({ to, from, answer, roomId }) => {
//     const callerSocketId = getSocketIdByUserId(to);
//     console.log(`✅ Video call accepted by ${from} for ${to}`);
    
//     if (callerSocketId) {
//       socket.to(callerSocketId).emit("videoCallAccepted", {
//         from,
//         answer
//       });
//       console.log(`✅ Video call acceptance sent to ${to}`);
//     }
//   });

//   // Decline video call
//   socket.on("declineVideoCall", ({ to, from, roomId }) => {
//     const callerSocketId = getSocketIdByUserId(to);
//     console.log(`❌ Video call declined by ${from} for ${to}`);
    
//     if (callerSocketId) {
//       socket.to(callerSocketId).emit("videoCallDeclined", {
//         from
//       });
//       console.log(`❌ Video call decline sent to ${to}`);
//     }
//   });

//   // End video call
//   socket.on("endVideoCall", ({ to, from, roomId }) => {
//     const otherUserSocketId = getSocketIdByUserId(to);
//     console.log(`📴 Video call ended by ${from} for ${to}`);
    
//     if (otherUserSocketId) {
//       socket.to(otherUserSocketId).emit("videoCallEnded", {
//         from
//       });
//       console.log(`📴 Video call end notification sent to ${to}`);
//     }
//   });

//   // ICE Candidate exchange
//   socket.on("iceCandidate", ({ candidate, to, roomId }) => {
//     const receiverSocketId = getSocketIdByUserId(to);
//     const senderUserId = getUserBySocketId(socket.id);
    
//     if (receiverSocketId) {
//       socket.to(receiverSocketId).emit("iceCandidate", {
//         candidate,
//         from: senderUserId
//       });
//       console.log(`🧊 ICE candidate sent from ${senderUserId} to ${to}`);
//     }
//   });

//   // Handle user going offline during call
//   socket.on("disconnect", () => {
//     const userId = getUserBySocketId(socket.id);
    
//     if (userId) {
//       // Notify all connected users that this user is offline
//       socket.broadcast.emit("userOffline", { userId });
      
//       // If user was in a call, end it for the other party
//       socket.broadcast.emit("videoCallEnded", { from: userId });
//     }
    
//     removeConnectedUser(socket.id);
//     console.log("❌ User disconnected:", socket.id);
//   });

//   // Handle connection errors
//   socket.on("connect_error", (error) => {
//     console.error("❌ Connection error:", error);
//   });

//   // Ping-pong for connection health
//   socket.on("ping", () => {
//     socket.emit("pong");
//   });
// });

// // ✅ Database + Server
// mongoose
//   .connect(process.env.DB_URL, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     connectTimeoutMS: 60000,
//   })
//   .then(() => {
//     console.log("✅ Database Connected Successfully..");

//     // Middlewares
//     app.use(express.json({ limit: "100mb" }));
//     app.use(cookieParser());
//     app.use(cors({ origin: "http://localhost:3001", credentials: true }));

//     // Routes
//     app.use("/user", UserRouter);
//     app.use("/chat", ChatRouter);
//     app.use("/contact", ContactRouter);

//     // Health check endpoint
//     app.get("/health", (req, res) => {
//       res.json({ 
//         status: "OK", 
//         connectedUsers: connectedUsers.size,
//         timestamp: new Date().toISOString()
//       });
//     });

//     // Debug endpoint to check chat rooms and messages
//     app.get("/debug/rooms", async (req, res) => {
//       try {
//         const rooms = await chatRoomModel.find({}).populate('participants');
//         const messages = await chatMessageModel.find({}).populate('chatRoom');
        
//         res.json({
//           totalRooms: rooms.length,
//           totalMessages: messages.length,
//           rooms: rooms.map(r => ({
//             _id: r._id,
//             roomId: r.roomId,
//             participants: r.participants,
//             messageCount: messages.filter(m => m.chatRoom && m.chatRoom._id.toString() === r._id.toString()).length
//           }))
//         });
//       } catch (error) {
//         res.status(500).json({ error: error.message });
//       }
//     });

//     // Start Server
//     httpServer.listen(process.env.PORT, () => {
//       console.log(`🚀 Server & Socket.IO running on port ${process.env.PORT}`);
//       console.log(`📡 Socket.IO CORS origin: http://localhost:3000`);
//     });
//   })
//   .catch((err) => {
//     console.log("❌ Database Connection failed...", err);
//   });

// // ✅ Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('🔄 SIGTERM received, shutting down gracefully');
//   httpServer.close(() => {
//     console.log('✅ HTTP server closed');
//     mongoose.connection.close(false, () => {
//       console.log('✅ MongoDB connection closed');
//       process.exit(0);
//     });
//   });
// });

// export { io, connectedUsers, getSocketIdByUserId };





  
  