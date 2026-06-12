import { FriendRequest } from "../models/FriendRequest.js";
import { User } from "../models/User.js";

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    userCode: user.userCode
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getRelationshipStatus(currentUserId, targetUserId) {
  if (currentUserId.equals(targetUserId)) {
    return "self";
  }

  const currentUser = await User.findById(currentUserId).select("friends");
  const isFriend = currentUser.friends.some((friendId) => friendId.equals(targetUserId));

  if (isFriend) {
    return "friends";
  }

  const pendingRequest = await FriendRequest.findOne({
    status: "pending",
    $or: [
      { requester: currentUserId, recipient: targetUserId },
      { requester: targetUserId, recipient: currentUserId }
    ]
  });

  if (!pendingRequest) {
    return "none";
  }

  return pendingRequest.requester.equals(currentUserId) ? "sent" : "received";
}

export async function searchUsers(req, res, next) {
  try {
    const query = String(req.query.q || "").trim();

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const normalizedEmail = query.toLowerCase();
    const normalizedCode = query.toUpperCase();
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { email: { $regex: escapeRegex(normalizedEmail), $options: "i" } },
        { userCode: normalizedCode }
      ]
    })
      .select("name email avatar userCode")
      .limit(10);

    const decoratedUsers = await Promise.all(
      users.map(async (user) => ({
        ...publicUser(user),
        relationshipStatus: await getRelationshipStatus(req.user._id, user._id)
      }))
    );

    res.json({ users: decoratedUsers });
  } catch (error) {
    next(error);
  }
}
