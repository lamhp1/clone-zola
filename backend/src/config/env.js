import dotenv from "dotenv";

dotenv.config();

function trimTrailingSlash(value) {
  return value?.replace(/\/+$/, "");
}

function parseUrls(value) {
  return String(value || "")
    .split(",")
    .map((url) => trimTrailingSlash(url.trim()))
    .filter(Boolean);
}

const clientUrl = trimTrailingSlash(process.env.CLIENT_URL || "http://localhost:5173");
const serverUrl = trimTrailingSlash(process.env.SERVER_URL || "http://localhost:5000");
const clientUrls = [...new Set([clientUrl, ...parseUrls(process.env.CLIENT_URLS)])];
const usesHttps = clientUrl.startsWith("https://") || serverUrl.startsWith("https://");

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl,
  clientUrls,
  serverUrl,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || "development_secret_change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : usesHttps,
  cookieSameSite: process.env.COOKIE_SAME_SITE || (usesHttps ? "none" : "lax"),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl:
    trimTrailingSlash(process.env.GOOGLE_CALLBACK_URL) ||
    "http://localhost:5000/api/auth/google/callback"
};
