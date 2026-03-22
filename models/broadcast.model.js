import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

const broadcastSchema = new mongoose.Schema(
    {
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        image: {
            type: s3FileSchema,
            default: null,
        },
        targetRole: {
            type: String,
            enum: ["Farmer", "FPO", "Staff", "All"], // Target specific roles
            default: "farmer",
        },
        recipientCount: {
            type: Number, // How many users received it
            default: 0,
        },
        successCount: {
            type: Number, // Successfully delivered
            default: 0,
        },
        failureCount: {
            type: Number, // Failed to deliver
            default: 0,
        },
        status: {
            type: String,
            enum: ["sent", "failed", "partial"], // partial = some succeeded, some failed
            default: "sent",
        },
        sentAt: {
            type: Date,
            default: Date.now,
        },
        error: String,
    },
    {
        timestamps: true,
    }
);

export const Broadcast = mongoose.model("Broadcast", broadcastSchema);