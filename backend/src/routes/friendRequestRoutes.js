import express from "express";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listFriendRequests,
  sendFriendRequest
} from "../controllers/friendRequestController.js";
import { requireAuth } from "../middleware/auth.js";

export const friendRequestRoutes = express.Router();

friendRequestRoutes.use(requireAuth);

friendRequestRoutes.get("/", listFriendRequests);
friendRequestRoutes.post("/", sendFriendRequest);
friendRequestRoutes.patch("/:id/accept", acceptFriendRequest);
friendRequestRoutes.patch("/:id/decline", declineFriendRequest);
friendRequestRoutes.patch("/:id/cancel", cancelFriendRequest);
