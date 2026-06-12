import express from "express";
import { searchUsers } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

export const userRoutes = express.Router();

userRoutes.get("/search", requireAuth, searchUsers);
