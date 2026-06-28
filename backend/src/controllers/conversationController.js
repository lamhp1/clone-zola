import mongoose from "mongoose";
import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import {
  areFriends,
  getOrCreateDirectConversation,
  userCanAccessConversation
} from "../utils/conversations.js";
import { getMessageType, serializeMessage } from "../utils/messages.js";

function serializeConversation(conversation, currentUserId) {
  const otherParticipant =
    conversation.type === "direct"
      ? conversation.participants.find((participant) => !participant._id.equals(currentUserId))
      : null;

  return {
    id: conversation._id,
    type: conversation.type,
    participants: conversation.participants,
    otherUser: otherParticipant || null,
    group: conversation.group || null,
    nicknames: conversation.nicknames || [],
    lastMessage: conversation.lastMessage,
    updatedAt: conversation.updatedAt
  };
}

export async function listFriends(req, res, next) {
  try {
    const user = await User.findById(req.user._id)
      .select("friends")
      .populate("friends", "name email avatar userCode");
    res.json({ friends: user?.friends || [] });
  } catch (error) {
    next(error);
  }
}

export async function listConversations(req, res, next) {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "name email avatar userCode")
      .populate({
        path: "group",
        populate: [
          { path: "members", select: "name email avatar userCode" },
          { path: "admins", select: "name email avatar userCode" }
        ]
      })
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name email avatar userCode" }
      })
      .sort({ updatedAt: -1 });

    res.json({
      conversations: conversations.map((conversation) =>
        serializeConversation(conversation, req.user._id)
      )
    });
  } catch (error) {
    next(error);
  }
}

export async function startDirectConversation(req, res, next) {
  try {
    const { friendId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(friendId)) return res.status(400).json({ message: "Invalid friend id" });
    if (req.user._id.equals(friendId)) return res.status(400).json({ message: "Cannot create a conversation with yourself" });
    const friend = await User.findById(friendId).select("name email avatar userCode");
    if (!friend) return res.status(404).json({ message: "Friend not found" });
    if (!(await areFriends(req.user._id, friend._id))) return res.status(403).json({ message: "Only friends can start a private chat" });
    const conversation = await getOrCreateDirectConversation(req.user._id, friend._id);
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar userCode")
      .populate({ path: "lastMessage", populate: { path: "sender", select: "name email avatar userCode" } });
    res.status(201).json({ conversation: serializeConversation(populatedConversation, req.user._id) });
  } catch (error) {
    next(error);
  }
}

export async function listMessages(req, res, next) {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !userCanAccessConversation(conversation, req.user._id)) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const messages = await Message.find({ conversation: conversation._id })
      .populate("sender", "name email avatar userCode")
      .sort({ createdAt: 1 })
      .limit(80);
    res.json({ messages: messages.map(serializeMessage) });
  } catch (error) {
    next(error);
  }
}

function uploadImage(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "zalo-clone/chat-images",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        const url = cloudinary.url(result.public_id, {
          secure: true,
          resource_type: "image",
          transformation: [{ fetch_format: "auto", quality: "auto" }]
        });

        resolve({
          url: url || result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes
        });
      }
    );

    stream.end(file.buffer);
  });
}

async function deleteUploadedImages(images) {
  await Promise.allSettled(images.map((image) => cloudinary.uploader.destroy(image.public_id)));
}

export async function createMessage(req, res, next) {
  const uploadedImages = [];
  let createdMessageId = null;

  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !userCanAccessConversation(conversation, req.user._id)) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const text = String(req.body.text || req.body.content || "").trim();
    const files = req.files || [];
    if (!text && !files.length) {
      return res.status(400).json({ message: "Message text or image is required" });
    }

    if (files.length) {
      const hasCloudinaryConfig =
        env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret;
      if (!hasCloudinaryConfig) {
        return res.status(500).json({ message: "Cloudinary is not configured" });
      }

      for (const file of files) {
        uploadedImages.push(await uploadImage(file));
      }
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      content: text,
      text,
      type: getMessageType(text, uploadedImages),
      images: uploadedImages,
      seenBy: [req.user._id]
    });
    createdMessageId = message._id;

    conversation.lastMessage = message._id;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate("sender", "name email avatar userCode");
    const serialized = serializeMessage(populatedMessage);
    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${conversation._id}`).emit("message:new", serialized);
      conversation.participants.forEach((participantId) => {
        io.to(`user:${participantId}`).emit("conversation:updated", {
          conversationId: conversation._id,
          lastMessage: serialized,
          updatedAt: conversation.updatedAt
        });
      });
    }

    res.status(201).json({ message: serialized });
  } catch (error) {
    if (createdMessageId) {
      await Message.findByIdAndDelete(createdMessageId).catch(() => {});
    }
    if (uploadedImages.length) {
      await deleteUploadedImages(uploadedImages);
    }
    next(error);
  }
}

export async function updateConversationNickname(req, res, next) {
  try {
    const { targetUserId, name = "" } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || !userCanAccessConversation(conversation, req.user._id)) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const isTargetInConversation = conversation.participants.some((participantId) => participantId.equals(targetUserId));
    if (!isTargetInConversation) return res.status(400).json({ message: "Target user is not in this conversation" });
    conversation.nicknames = conversation.nicknames.filter(
      (nickname) => !nickname.owner.equals(req.user._id) || !nickname.target.equals(targetUserId)
    );
    if (name.trim()) {
      conversation.nicknames.push({ owner: req.user._id, target: targetUserId, name: name.trim() });
    }
    await conversation.save();
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar userCode")
      .populate({
        path: "group",
        populate: [
          { path: "members", select: "name email avatar userCode" },
          { path: "admins", select: "name email avatar userCode" }
        ]
      })
      .populate({ path: "lastMessage", populate: { path: "sender", select: "name email avatar userCode" } });
    res.json({ conversation: serializeConversation(populatedConversation, req.user._id) });
  } catch (error) {
    next(error);
  }
}
