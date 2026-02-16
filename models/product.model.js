import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

const ProductSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
      default: null,
    },
    brand: {
      type: String,
      required: true,
    },
    mrp: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: false,
      default: null,
    },
    productImage: {
      type: s3FileSchema,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", ProductSchema);
