import Chat from "../models/chatRoom.model.js";
import Message from "../models/chatMessage.model.js";

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


export const getRoomMessages = async (req, res,next) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ chatRoom: roomId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Error fetching messages" });
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
