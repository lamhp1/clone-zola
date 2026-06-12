import express from "express";
import passport from "passport";
import { getCurrentUser, handleGoogleCallback, logout } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

export const authRoutes = express.Router();

authRoutes.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "login select_account"
  })
);

authRoutes.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/auth/google/failure",
    session: false
  }),
  handleGoogleCallback
);

authRoutes.get("/google/failure", (_req, res) => {
  res.status(401).json({ message: "Google login failed" });
});

authRoutes.get("/me", requireAuth, getCurrentUser);
authRoutes.post("/logout", requireAuth, logout);
