import express from "express";
import {
  addGroupMember,
  createGroup,
  getGroup,
  leaveGroup,
  removeGroupMember,
  renameGroup
} from "../controllers/groupController.js";
import { requireAuth } from "../middleware/auth.js";

export const groupRoutes = express.Router();

groupRoutes.use(requireAuth);

groupRoutes.post("/", createGroup);
groupRoutes.get("/:id", getGroup);
groupRoutes.patch("/:id", renameGroup);
groupRoutes.post("/:id/members", addGroupMember);
groupRoutes.delete("/:id/members/:memberId", removeGroupMember);
groupRoutes.post("/:id/leave", leaveGroup);
