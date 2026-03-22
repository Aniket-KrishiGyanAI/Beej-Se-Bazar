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
    products: [
      {
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
        parameter: {
          type: String, // Lt. - 1/2/5/10 or Kg - 250/500/1000
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
      }
    ],
    productImages: [s3FileSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", ProductSchema);
