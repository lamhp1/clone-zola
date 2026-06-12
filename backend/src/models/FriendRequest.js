import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
      index: true
    }
  },
  {
    timestamps: true
  }
);

friendRequestSchema.index(
  { requester: 1, recipient: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" }
  }
);

export const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema);
