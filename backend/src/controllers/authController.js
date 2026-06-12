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
  const redirectUrl = new URL("/auth/callback", env.clientUrl);

  redirectUrl.searchParams.set("token", token);
  res.cookie("token", token, authCookieOptions);

  res.redirect(redirectUrl.toString());
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
