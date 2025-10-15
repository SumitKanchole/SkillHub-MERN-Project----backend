import express from "express";
import { createOrGetChatRoom, getRoomMessages, sendMessage } from "../controller/chat.controller.js";

const router = express.Router();

router.post("/send-message", sendMessage);
router.post("/createRoom/:userId", createOrGetChatRoom);
router.get("/room/:roomId/messages", getRoomMessages);

export default router;
