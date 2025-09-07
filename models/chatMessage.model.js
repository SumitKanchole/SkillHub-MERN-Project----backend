// import mongoose from "mongoose";

// const ChatMessageSchema = new mongoose.Schema({
//     chatRoomId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "ChatRoom",
//         required: true,
//         index: true
//     },
//     sender: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "user",
//         required: true
//     },
//     receiver: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "user",
//         required: true
//     },
//     message: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     isRead: {
//         type: Boolean,
//         default: false
//     }
// }, { timestamps: true, versionKey: false });

// ChatMessageSchema.index({ chatRoomId: 1, createdAt: 1 });
// ChatMessageSchema.index({ sender: 1, receiver: 1 });

// const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);
// export default ChatMessage;








// import mongoose from "mongoose";

// const ChatMessageSchema = new mongoose.Schema({
//   chatRoomId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "ChatRoom",
//     required: true,
//     index: true,
//   },
//   sender: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "user",
//     required: true,
//   },
//   receiver: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "user",
//     required: true,
//   },
//   message: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   isRead: {
//     type: Boolean,
//     default: false,
//   },
// }, { timestamps: true, versionKey: false });

// ChatMessageSchema.index({ chatRoomId: 1, createdAt: 1 });

// const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);
// export default ChatMessage;




// models/message.model.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  message: { type: String, required: true },
  senderName: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Message", MessageSchema);
