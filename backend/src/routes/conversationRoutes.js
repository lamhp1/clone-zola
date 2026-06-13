import express from "express";
import {
  listConversations,
  listFriends,
  listMessages,
  startDirectConversation,
  updateConversationNickname
} from "../controllers/conversationController.js";
import { requireAuth } from "../middleware/auth.js";

export const conversationRoutes = express.Router();

conversationRoutes.use(requireAuth);

conversationRoutes.get("/friends", listFriends);
conversationRoutes.get("/", listConversations);
conversationRoutes.post("/direct", startDirectConversation);
conversationRoutes.patch("/:id/nickname", updateConversationNickname);
conversationRoutes.get("/:id/messages", listMessages);
