import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      index: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ type: 1, participants: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
