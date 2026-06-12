import mongoose from "mongoose";
import { Conversation } from "../models/Conversation.js";
import { Group } from "../models/Group.js";
import { User } from "../models/User.js";

function isMember(group, userId) {
  return group.members.some((memberId) => memberId.equals(userId));
}

function isAdmin(group, userId) {
  return group.admins.some((adminId) => adminId.equals(userId));
}

async function assertFriends(currentUserId, memberIds) {
  const user = await User.findById(currentUserId).select("friends");
  const friendSet = new Set(user.friends.map((friendId) => friendId.toString()));
  return memberIds.every((memberId) => friendSet.has(memberId.toString()));
}

async function populateGroup(groupId) {
  return Group.findById(groupId)
    .populate("members", "name email avatar userCode")
    .populate("admins", "name email avatar userCode")
    .populate("conversation");
}

export async function createGroup(req, res, next) {
  try {
    const { name, avatar = "", memberIds = [] } = req.body;
    const uniqueMemberIds = [...new Set(memberIds)].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!name?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (uniqueMemberIds.length < 1) {
      return res.status(400).json({ message: "Choose at least one friend" });
    }

    const allMembersAreFriends = await assertFriends(req.user._id, uniqueMemberIds);

    if (!allMembersAreFriends) {
      return res.status(403).json({ message: "Groups can only be created with friends" });
    }

    const participants = [req.user._id, ...uniqueMemberIds];
    const conversation = await Conversation.create({
      type: "group",
      participants
    });

    const group = await Group.create({
      name: name.trim(),
      avatar,
      conversation: conversation._id,
      members: participants,
      admins: [req.user._id]
    });

    conversation.group = group._id;
    await conversation.save();

    const populatedGroup = await populateGroup(group._id);

    res.status(201).json({ group: populatedGroup });
  } catch (error) {
    next(error);
  }
}

export async function getGroup(req, res, next) {
  try {
    const group = await populateGroup(req.params.id);

    if (!group || !isMember(group, req.user._id)) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json({ group });
  } catch (error) {
    next(error);
  }
}

export async function renameGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || !isMember(group, req.user._id)) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ message: "Only group admins can rename the group" });
    }

    if (!req.body.name?.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    group.name = req.body.name.trim();
    await group.save();

    res.json({ group: await populateGroup(group._id) });
  } catch (error) {
    next(error);
  }
}

export async function addGroupMember(req, res, next) {
  try {
    const { memberId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group || !isMember(group, req.user._id)) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ message: "Only group admins can add members" });
    }

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid member id" });
    }

    if (!(await assertFriends(req.user._id, [memberId]))) {
      return res.status(403).json({ message: "You can only add your friends" });
    }

    group.members.addToSet(memberId);
    await group.save();

    await Conversation.findByIdAndUpdate(group.conversation, {
      $addToSet: { participants: memberId }
    });

    res.json({ group: await populateGroup(group._id) });
  } catch (error) {
    next(error);
  }
}

export async function removeGroupMember(req, res, next) {
  try {
    const { memberId } = req.params;
    const group = await Group.findById(req.params.id);

    if (!group || !isMember(group, req.user._id)) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ message: "Only group admins can remove members" });
    }

    if (group.admins.some((adminId) => adminId.equals(memberId))) {
      return res.status(400).json({ message: "Cannot remove a group admin" });
    }

    group.members.pull(memberId);
    await group.save();

    await Conversation.findByIdAndUpdate(group.conversation, {
      $pull: { participants: memberId }
    });

    res.json({ group: await populateGroup(group._id) });
  } catch (error) {
    next(error);
  }
}

export async function leaveGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || !isMember(group, req.user._id)) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (isAdmin(group, req.user._id) && group.admins.length === 1 && group.members.length > 1) {
      return res.status(400).json({ message: "Assign another admin before leaving" });
    }

    group.members.pull(req.user._id);
    group.admins.pull(req.user._id);
    await group.save();

    await Conversation.findByIdAndUpdate(group.conversation, {
      $pull: { participants: req.user._id }
    });

    res.json({ group: await populateGroup(group._id) });
  } catch (error) {
    next(error);
  }
}
