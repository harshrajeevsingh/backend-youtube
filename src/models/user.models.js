import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // Cloudinary id
      required: true,
    },
    coverImg: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// It's a middleware in mongoose( a type of hook)
// We are ensuring to hash the password using bcrypt just before saving it to the DB.
userSchema.pre("save", async function (next) {
  if (!this.modified("password")) return next(); // This is to check if password is being modified then only hash it, otherwise even if we update any other field, the hashing function will be called.

  this.password = bcrypt.hash(this.password, 10);
  next();
});

// We can create any method in mongoose.
// Here we created a method to compare the text-password with hashed-password
userSchema.methods.isPaswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Methods to generate Access Token n Refresh Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
export const User = mongoose.model("User", userSchema);

// NOTICE that we haven't used arrow fn, because with arrow fn we won't get "this" method of JS, so we use traditional fn here.
