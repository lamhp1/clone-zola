import mongoose from "mongoose";
import { FriendRequest } from "../models/FriendRequest.js";
import { User } from "../models/User.js";

function toRequestResponse(request) {
  return {
    id: request._id,
    status: request.status,
    requester: request.requester,
    recipient: request.recipient,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  };
}

function isSameUser(left, right) {
  return left.toString() === right.toString();
}

async function assertUserExists(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return User.findById(userId);
}

export async function listFriendRequests(req, res, next) {
  try {
    const [incoming, outgoing] = await Promise.all([
      FriendRequest.find({ recipient: req.user._id, status: "pending" })
        .populate("requester", "name email avatar userCode")
        .sort({ createdAt: -1 }),
      FriendRequest.find({ requester: req.user._id, status: "pending" })
        .populate("recipient", "name email avatar userCode")
        .sort({ createdAt: -1 })
    ]);

    res.json({ incoming, outgoing });
  } catch (error) {
    next(error);
  }
}

export async function sendFriendRequest(req, res, next) {
  try {
    const { recipientId } = req.body;
    const recipient = await assertUserExists(recipientId);

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    if (isSameUser(req.user._id, recipient._id)) {
      return res.status(400).json({ message: "Cannot send a friend request to yourself" });
    }

    const currentUser = await User.findById(req.user._id).select("friends");
    const alreadyFriends = currentUser.friends.some((friendId) => friendId.equals(recipient._id));

    if (alreadyFriends) {
      return res.status(409).json({ message: "Users are already friends" });
    }

    const reversePendingRequest = await FriendRequest.findOne({
      requester: recipient._id,
      recipient: req.user._id,
      status: "pending"
    });

    if (reversePendingRequest) {
      return res.status(409).json({
        message: "This user already sent you a friend request",
        request: toRequestResponse(reversePendingRequest)
      });
    }

    const existingPendingRequest = await FriendRequest.findOne({
      requester: req.user._id,
      recipient: recipient._id,
      status: "pending"
    });

    if (existingPendingRequest) {
      return res.status(409).json({
        message: "Friend request already sent",
        request: toRequestResponse(existingPendingRequest)
      });
    }

    const request = await FriendRequest.create({
      requester: req.user._id,
      recipient: recipient._id
    });

    res.status(201).json({ request: toRequestResponse(request) });
  } catch (error) {
    next(error);
  }
}

export async function acceptFriendRequest(req, res, next) {
  try {
    const acceptedRequest = await FriendRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id,
        status: "pending"
      },
      { status: "accepted" },
      { new: true }
    );

    if (!acceptedRequest) {
      return res.status(404).json({ message: "Pending friend request not found" });
    }

    await Promise.all([
      User.findByIdAndUpdate(acceptedRequest.requester, {
        $addToSet: { friends: acceptedRequest.recipient }
      }),
      User.findByIdAndUpdate(acceptedRequest.recipient, {
        $addToSet: { friends: acceptedRequest.requester }
      })
    ]);

    res.json({ request: toRequestResponse(acceptedRequest) });
  } catch (error) {
    next(error);
  }
}

export async function declineFriendRequest(req, res, next) {
  try {
    const request = await FriendRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id,
        status: "pending"
      },
      { status: "declined" },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Pending friend request not found" });
    }

    res.json({ request: toRequestResponse(request) });
  } catch (error) {
    next(error);
  }
}

export async function cancelFriendRequest(req, res, next) {
  try {
    const request = await FriendRequest.findOneAndUpdate(
      {
        _id: req.params.id,
        requester: req.user._id,
        status: "pending"
      },
      { status: "cancelled" },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Pending friend request not found" });
    }

    res.json({ request: toRequestResponse(request) });
  } catch (error) {
    next(error);
  }
}
