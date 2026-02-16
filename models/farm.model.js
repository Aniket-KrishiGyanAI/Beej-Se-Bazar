import mongoose from "mongoose";

const farmSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    farmName: { type: String, required: true },
    farmArea: { type: String, required: true },
    unit: { type: String, required: true },

    geojson: {
      type: {
        type: String,
        enum: ["Feature"],
        required: true,
      },
      geometry: {
        type: {
          type: String,
          enum: ["Polygon"],
          required: true,
        },
        coordinates: {
          type: [[[Number]]],
          required: true,
        },
      },
    },
  },
  { timestamps: true }
);

export const Farm = mongoose.model("Farm", farmSchema);
