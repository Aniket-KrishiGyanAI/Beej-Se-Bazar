import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

const cropDoctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: s3FileSchema,
    diagnosis: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const CropDoctor = mongoose.model("CropDoctor", cropDoctorSchema);
