import jwt from "jsonwebtoken";
import { Conversation } from "./models/Conversation.js";
import { Message } from "./models/Message.js";
import { User } from "./models/User.js";
import { env } from "./config/env.js";
import { userCanAccessConversation } from "./utils/conversations.js";

function parseCookie(header = "") {
  return header.split(";").reduce((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");

    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

async function authenticateSocket(socket, next) {
  try {
    const authToken = socket.handshake.auth?.token;
    const bearerToken = socket.handshake.headers.authorization?.startsWith("Bearer ")
      ? socket.handshake.headers.authorization.slice(7)
      : null;
    const cookieToken = parseCookie(socket.handshake.headers.cookie).token;
    const token = authToken || bearerToken || cookieToken;

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select("-__v");

    if (!user) {
      next(new Error("User no longer exists"));
      return;
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
}

function serializeMessage(message) {
  return {
    id: message._id,
    conversation: message.conversation,
    sender: message.sender,
    content: message.content,
    type: message.type,
    seenBy: message.seenBy,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
}

export function registerSocketHandlers(io) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);
    socket.emit("presence:online", { userId: socket.user._id });

    socket.on("conversation:join", async ({ conversationId }, callback) => {
      try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation || !userCanAccessConversation(conversation, socket.user._id)) {
          callback?.({ ok: false, message: "Conversation not found" });
          return;
        }

        socket.join(`conversation:${conversation._id}`);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: "Could not join conversation" });
      }
    });

    socket.on("message:send", async ({ conversationId, content }, callback) => {
      try {
        const trimmedContent = String(content || "").trim();

        if (!trimmedContent) {
          callback?.({ ok: false, message: "Message content is required" });
          return;
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation || !userCanAccessConversation(conversation, socket.user._id)) {
          callback?.({ ok: false, message: "Conversation not found" });
          return;
        }

        const message = await Message.create({
          conversation: conversation._id,
          sender: socket.user._id,
          content: trimmedContent,
          type: "text",
          seenBy: [socket.user._id]
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        const populatedMessage = await Message.findById(message._id).populate(
          "sender",
          "name email avatar userCode"
        );

        io.to(`conversation:${conversation._id}`).emit(
          "message:new",
          serializeMessage(populatedMessage)
        );

        conversation.participants.forEach((participantId) => {
          io.to(`user:${participantId}`).emit("conversation:updated", {
            conversationId: conversation._id,
            lastMessage: serializeMessage(populatedMessage),
            updatedAt: conversation.updatedAt
          });
        });

        callback?.({ ok: true, message: serializeMessage(populatedMessage) });
      } catch (error) {
        callback?.({ ok: false, message: "Could not send message" });
      }
    });

    socket.on("disconnect", () => {
      socket.broadcast.emit("presence:offline", { userId: socket.user._id });
    });
  });
}
