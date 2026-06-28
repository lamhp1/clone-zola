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
      default: "",
      trim: true,
      maxlength: 4000
    },
    text: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4000
    },
    type: {
      type: String,
      enum: ["text", "image", "mixed", "sticker"],
      default: "text"
    },
    images: [
      {
        _id: false,
        url: {
          type: String,
          required: true
        },
        public_id: {
          type: String,
          required: true
        },
        width: Number,
        height: Number,
        format: String,
        bytes: Number
      }
    ],
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        icon: {
          type: String,
          required: true,
          maxlength: 16
        }
      }
    ],
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
