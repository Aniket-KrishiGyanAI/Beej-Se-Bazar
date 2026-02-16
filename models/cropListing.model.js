import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

const cropListingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cropName: {
      type: String,
      required: true,
    },
    variety: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
        required: true,
      },
    },
    cropImages: [s3FileSchema],
    harvestDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["approved", "pending", "sold", "reject"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

cropListingSchema.index({ location: "2dsphere" });

export const CropListing = mongoose.model("CropListing", cropListingSchema);
