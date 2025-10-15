
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  message: { type: String, required: true },
  senderName: { type: String, required: true },
}, { timestamps: true,versionKey:false });

export default mongoose.model("Message", MessageSchema);
