import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
}, { timestamps: true,versionKey:false });

export default mongoose.model("Chat", ChatSchema);
