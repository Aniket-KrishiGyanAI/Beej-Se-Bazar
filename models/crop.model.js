import mongoose from "mongoose";

const userCropSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    farmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
    },
    cropName: {
      type: String,
      required: true,
    },
    area: { type: Number, required: true },
    unit: { type: String, enum: ["acre", "hectare"], default: "acre" },
    sowingDate: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Crop = mongoose.model("Crop", userCropSchema);
