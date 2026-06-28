import express from "express";
import {
  createMessage,
  listConversations,
  listFriends,
  listMessages,
  startDirectConversation,
  updateConversationNickname
} from "../controllers/conversationController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadMessageImages } from "../middleware/imageUpload.js";

export const conversationRoutes = express.Router();

conversationRoutes.use(requireAuth);

conversationRoutes.get("/friends", listFriends);
conversationRoutes.get("/", listConversations);
conversationRoutes.post("/direct", startDirectConversation);
conversationRoutes.patch("/:id/nickname", updateConversationNickname);
conversationRoutes.get("/:id/messages", listMessages);
conversationRoutes.post("/:id/messages", uploadMessageImages, createMessage);
