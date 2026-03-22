import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

// crop schema
const cropSchema = new mongoose.Schema({
  cropName: {
    type: String,
    required: true,
  },

  season: {
    type: String,
    enum: ["kharif", "rabi", "zaid"],
    required: true,
  },

  quantityProduced: {
    type: String,
  },
});

// land schema
const landSchema = new mongoose.Schema({
  plotId: {
    type: String,
    required: true,
  },

  area: {
    type: Number,
    required: true,
  },

  irrigationType: {
    type: String,
    enum: ["well", "canal", "drip", "sprinkler", "rain-dependent"],
    required: true,
  },

  soilType: {
    type: String,
    enum: [
      "alluvial",
      "black",
      "red",
      "laterite",
      "desert",
      "forest",
      "peaty",
      "alkaline",
    ],
    required: true,
  },
});

// farmer registration
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      // required: true,
      trim: true,
    },
    lastName: {
      type: String,
      // required: true,
      trim: true,
    },
    phone: {
      type: String,
      // required: true,
      unique: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      // required: true,
    },

    password: {
      type: String,
      // required: true,
      minlength: 6,
    },

    village: String,
    district: String,
    state: String,

    profileImage: {
      type: s3FileSchema, // image/jpeg, image/png
      default: null,
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
  },
  { discriminatorKey: "role", timestamps: true },
);

export const User = mongoose.model("User", userSchema);

// Discriminator for "Farmer"
const farmerSchema = new mongoose.Schema({
  farmerCategory: {
    type: String,
    enum: ["small", "marginal", "medium"],
    // required: true,
  },

  // emailId: { type: String, default: null },

  cropsGrown: [cropSchema],
  landDetails: [landSchema],

  bankName: { type: String, default: null },
  ifscCode: { type: String, default: null },
  accountNumber: { type: String, default: null },

  status: {
    type: String,
    enum: ["pending", "verified"],
    default: "pending",
  },

  // 📁 S3 Uploaded Files
  soilHealthCard: {
    type: s3FileSchema, // PDF
    default: null,
  },

  labReport: {
    type: s3FileSchema, // PDF
    default: null,
  },

  govtSchemeDocs: [
    {
      type: s3FileSchema, // multiple PDFs
      default: null,
    },
  ],
});

export const Farmer = User.discriminator("Farmer", farmerSchema);

// Discriminator for "Staff"
const staffSchema = new mongoose.Schema({
  emailId: {
    type: String,
    // required: true,
    unique: true,
  },
  joiningDate: {
    type: Date,
    // required: true,
  },
});

export const Staff = User.discriminator("Staff", staffSchema);

// Discriminator for "FPO"
const fpoSchema = new mongoose.Schema({
  gstNumber: {
    type: String,
    // required: true,
  },
  shopName: {
    type: String,
    // required: true,
  },
  emailId: {
    type: String,
    // required: true,
    unique: true,
  },
});

export const FPO = User.discriminator("FPO", fpoSchema);
