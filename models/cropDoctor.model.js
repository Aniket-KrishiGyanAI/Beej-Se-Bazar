import mongoose from "mongoose";

const cropDoctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    diagnosis: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const CropDoctor = mongoose.model("CropDoctor", cropDoctorSchema);
