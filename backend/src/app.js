import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import { env } from "./config/env.js";
import { configurePassport } from "./config/passport.js";
import { authRoutes } from "./routes/authRoutes.js";
import { conversationRoutes } from "./routes/conversationRoutes.js";
import { friendRequestRoutes } from "./routes/friendRequestRoutes.js";
import { groupRoutes } from "./routes/groupRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";

configurePassport();

export const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friend-requests", friendRequestRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/groups", groupRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});
