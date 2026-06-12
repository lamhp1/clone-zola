import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000
    },
    type: {
      type: String,
      enum: ["text"],
      default: "text"
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
