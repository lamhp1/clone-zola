import { Conversation } from "../models/Conversation.js";
import { User } from "../models/User.js";

export async function areFriends(userId, otherUserId) {
  const user = await User.findById(userId).select("friends");

  if (!user) {
    return false;
  }

  return user.friends.some((friendId) => friendId.equals(otherUserId));
}

export async function findDirectConversation(userId, otherUserId) {
  return Conversation.findOne({
    type: "direct",
    participants: { $all: [userId, otherUserId], $size: 2 }
  });
}

export async function getOrCreateDirectConversation(userId, otherUserId) {
  let conversation = await findDirectConversation(userId, otherUserId);

  if (conversation) {
    return conversation;
  }

  conversation = await Conversation.create({
    type: "direct",
    participants: [userId, otherUserId]
  });

  return conversation;
}

export function userCanAccessConversation(conversation, userId) {
  return conversation.participants.some((participantId) => participantId.equals(userId));
}
