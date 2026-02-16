import mongoose from "mongoose";

export const s3FileSchema = new mongoose.Schema(
  {
    bucket: {
      type: String,
      required: true,
    },

    key: {
      type: String,
      required: true, // S3 object key
    },

    url: {
      type: String,
      required: true, // public or signed URL
    },

    contentType: {
      type: String, // image/jpeg, application/pdf
      required: true,
    },

    size: {
      type: Number, // in bytes
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);
