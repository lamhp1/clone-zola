import { env } from "../config/env.js";
import { signAuthToken } from "../utils/tokens.js";

export function handleGoogleCallback(req, res) {
  const token = signAuthToken(req.user);

  res.cookie("token", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.redirect(`${env.clientUrl}/auth/callback`);
}

export function getCurrentUser(req, res) {
  res.json({ user: req.user });
}

export function logout(_req, res) {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
}
