import { env } from "../config/env.js";
import { signAuthToken } from "../utils/tokens.js";

const authCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export function handleGoogleCallback(req, res) {
  const token = signAuthToken(req.user);

  res.cookie("token", token, authCookieOptions);

  res.redirect(`${env.clientUrl}/auth/callback`);
}

export function getCurrentUser(req, res) {
  res.json({ user: req.user });
}

export function logout(_req, res) {
  res.clearCookie("token", {
    httpOnly: authCookieOptions.httpOnly,
    secure: authCookieOptions.secure,
    sameSite: authCookieOptions.sameSite
  });
  res.json({ message: "Logged out" });
}
