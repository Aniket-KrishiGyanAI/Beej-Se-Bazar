import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL auto delete
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Otp = mongoose.model("Otp", otpSchema);