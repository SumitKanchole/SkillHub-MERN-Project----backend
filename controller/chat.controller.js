import Chat from "../models/chatRoom.model.js";
import Message from "../models/chatMessage.model.js";
import chatMessageModel from "../models/chatMessage.model.js";
import chatRoomModel from "../models/chatRoom.model.js";

export const createOrGetChatRoom = async (req, res,next) => {
  try {
    const currentUserId = req.user._id; // you must set req.user from auth middleware
    const otherUserId = req.params.userId;

    let chatRoom = await Chat.findOne({
      participants: { $all: [currentUserId, otherUserId] }
    });

    if (!chatRoom) {
      chatRoom = new Chat({ participants: [currentUserId, otherUserId] });
      await chatRoom.save();
    }

    res.json({ chatRoom });
  } catch (err) {
    res.status(500).json({ error: "Error creating chat room" });
  }
};


// export const getRoomMessages = async (req, res,next) => {
//   try {
//     const { roomId } = req.params;
//     const messages = await Message.find({ chatRoom: roomId }).sort({ createdAt: 1 });
//     res.json(messages);
//   } catch (err) {
//     res.status(500).json({ error: "Error fetching messages" });
//   }
// };


export const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    console.log(`📚 Fetching messages for roomId: ${roomId}`);

    // Find the chat room first
    let chatRoom = await chatRoomModel.findOne({
      roomId: roomId
    });

    if (!chatRoom) {
      // If room doesn't exist, create it from roomId
      const participantIds = roomId.split("_");
      
      if (participantIds.length !== 2) {
        return res.status(400).json({
          success: false,
          error: "Invalid roomId format"
        });
      }

      chatRoom = new chatRoomModel({
        participants: participantIds,
        roomId: roomId
      });
      await chatRoom.save();
      console.log("📨 Chat room created for:", roomId);
    }

    // Fetch messages using chatRoom ObjectId with pagination
    const messages = await chatMessageModel
      .find({ chatRoom: chatRoom._id })
      .sort({ createdAt: 1 }) // Oldest first
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .lean(); // For better performance

    console.log(`📚 Found ${messages.length} messages for room ${roomId}`);

    // Format messages for frontend
    const formattedMessages = messages.map(message => ({
      _id: message._id,
      sender: message.sender._id,
      senderName: message.senderName,
      receiver: message.receiver._id,
      message: message.message,
      timestamp: message.createdAt,
      createdAt: message.createdAt
    }));

    res.status(200).json({
      success: true,
      messages: formattedMessages,
      roomId,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length
      }
    });

  } catch (error) {
    console.error("❌ Error fetching room messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages",
      details: error.message
    });
  }
};


export const sendMessage = async (req, res,next) => {
  try {
    const { sender, receiver, message, roomId } = req.body;
    const newMessage = new Message({ chatRoom: roomId, sender, receiver, message });
    await newMessage.save();
    return res.status(201).json(newMessage);
  } catch (err) {
    return res.status(500).json({ error: "Error sending message" });
  }
};
