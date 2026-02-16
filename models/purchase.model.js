import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    crop: {
      type: String,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    procurementDate: {
      type: Date,
      required: true,
    },
    procurementCenter: {
      type: String,
      required: true,
    },
    godown: {
      type: String,
      required: false,
      default: null,
    },
    vehicle: {
      type: String,
      required: false,
      default: null,
    },
    remarks: {
      type: String,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

export const Purchase = mongoose.model("Purchase", purchaseSchema);
