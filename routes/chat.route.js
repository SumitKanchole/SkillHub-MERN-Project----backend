// // routes/chat.route.js
// import express from "express";
// import {
//     createOrGetChatRoom,
//     sendMessage,
//     getMessages,
//     getUserChatRooms,
//     deleteMessage
// } from "../controller/chat.controller.js";
// import { auth } from "../middleware/auth.js";

// const router = express.Router();

// router.post("/room/:userId", auth, createOrGetChatRoom);

// router.post("/message", auth, sendMessage);

// router.get("/messages/:roomId", auth, getMessages);

// router.get("/rooms", auth, getUserChatRooms);

// router.delete("/message/:messageId", auth, deleteMessage);

// export default router;











// import express from "express";
// import { createOrGetChatRoom, sendMessage, getMessages, fetchMessages } from "../controller/chat.controller.js";
// import { auth } from "../middleware/auth.js";

// const router = express.Router();

// router.post("/room/:userId", auth, createOrGetChatRoom);
// router.post("/message", auth, sendMessage);
// router.get("/messages/:roomId", auth, getMessages);
// router.get("/room/:roomId/messages", fetchMessages);

// export default router;






import express from "express";
import { createOrGetChatRoom, getRoomMessages, sendMessage } from "../controller/chat.controller.js";

const router = express.Router();

router.post("/send-message", sendMessage);
router.post("/createRoom/:userId", createOrGetChatRoom);
router.get("/room/:roomId/messages", getRoomMessages);

export default router;
