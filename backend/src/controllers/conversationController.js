import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import {
  areFriends,
  getOrCreateDirectConversation,
  userCanAccessConversation
} from "../utils/conversations.js";

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
    const conversations = await Conversation.find({
      participants: req.user._id
    })
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

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({ message: "Invalid friend id" });
    }

    if (req.user._id.equals(friendId)) {
      return res.status(400).json({ message: "Cannot create a conversation with yourself" });
    }

    const friend = await User.findById(friendId).select("name email avatar userCode");

    if (!friend) {
      return res.status(404).json({ message: "Friend not found" });
    }

    const isFriend = await areFriends(req.user._id, friend._id);

    if (!isFriend) {
      return res.status(403).json({ message: "Only friends can start a private chat" });
    }

    const conversation = await getOrCreateDirectConversation(req.user._id, friend._id);
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatar userCode")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name email avatar userCode" }
      });

    res.status(201).json({
      conversation: serializeConversation(populatedConversation, req.user._id)
    });
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

    res.json({ messages });
  } catch (error) {
    next(error);
  }
}
