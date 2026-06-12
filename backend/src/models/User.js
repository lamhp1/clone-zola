import mongoose from "mongoose";

const USER_CODE_LENGTH = 9;
const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createUserCode() {
  let code = "";

  for (let index = 0; index < USER_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * USER_CODE_ALPHABET.length);
    code += USER_CODE_ALPHABET[randomIndex];
  }

  return code;
}

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    avatar: {
      type: String,
      default: ""
    },
    userCode: {
      type: String,
      unique: true,
      index: true,
      minlength: USER_CODE_LENGTH,
      maxlength: USER_CODE_LENGTH
    },
    friends: [
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

userSchema.pre("validate", async function ensureUserCode(next) {
  if (this.userCode) {
    next();
    return;
  }

  let code;
  let exists = true;

  while (exists) {
    code = createUserCode();
    exists = await mongoose.models.User.exists({ userCode: code });
  }

  this.userCode = code;
  next();
});

export const User = mongoose.model("User", userSchema);
