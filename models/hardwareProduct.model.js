import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

// hardware product schema
const hardwareProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
        description: { type: String, default: "" },
        key_features: [{ type: String }],
        technical_details: [{ type: String }],
        price: { type: String },
        product_type: { type: String, enum: ["Hardware", "Software"], required: true },
        images: [s3FileSchema],
        videos: [s3FileSchema],
    },
    { timestamps: true }
);

export const HardwareProduct = mongoose.model("HardwareProduct", hardwareProductSchema);