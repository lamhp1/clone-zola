import { Conversation } from "../models/Conversation.js";
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function searchUsers(req, res, next) {
  try {
    const query = String(req.query.q || "").trim();

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const normalizedEmail = query.toLowerCase();
    const normalizedCode = query.toUpperCase();
    const matcher = new RegExp(escapeRegex(query), "i");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { email: { $regex: escapeRegex(normalizedEmail), $options: "i" } },
        { userCode: normalizedCode }
      ]
    })
      .select("name email avatar userCode")
      .limit(10);

    const nicknameConversations = await Conversation.find({
      type: "direct",
      participants: req.user._id,
      nicknames: {
        $elemMatch: {
          owner: req.user._id,
          name: matcher
        }
      }
    })
      .select("participants nicknames")
      .populate("participants", "name email avatar userCode")
      .limit(10);

    const usersById = new Map(users.map((user) => [String(user._id), { user }]));

    nicknameConversations.forEach((conversation) => {
      const targetUser = conversation.participants.find(
        (participant) => !participant._id.equals(req.user._id)
      );
      const nickname = conversation.nicknames.find(
        (item) => item.owner.equals(req.user._id) && matcher.test(item.name)
      );

      if (targetUser && !usersById.has(String(targetUser._id))) {
        usersById.set(String(targetUser._id), {
          user: targetUser,
          matchedNickname: nickname?.name || ""
        });
      }
    });

    const decoratedUsers = await Promise.all(
      [...usersById.values()].slice(0, 10).map(async ({ user, matchedNickname }) => ({
        ...publicUser(user),
        matchedNickname,
        relationshipStatus: await getRelationshipStatus(req.user._id, user._id)
      }))
    );

    res.json({ users: decoratedUsers });
  } catch (error) {
    next(error);
  }
}
