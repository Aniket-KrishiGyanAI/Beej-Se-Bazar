import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caption: { type: String },
    postImage: {
      type: s3FileSchema,
      default: null,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Like" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Dislike" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    shares: [{ type: mongoose.Schema.Types.ObjectId, ref: "Share" }],
  },
  { timestamps: true },
);

export const Post = mongoose.model("Post", PostSchema);

// like
const LikeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true },
);

export const Like = mongoose.model("Like", LikeSchema);

// dislike
const DislikeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true },
);

export const Dislike = mongoose.model("Dislike", DislikeSchema);

// comment
const CommentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    comment: { type: String, required: true },
  },
  { timestamps: true },
);
export const Comment = mongoose.model("Comment", CommentSchema);

// share
const ShareSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true },
);
export const Share = mongoose.model("Share", ShareSchema);
