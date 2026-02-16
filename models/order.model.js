import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Farmer
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },
        quantity: Number,
        expectedPrice: Number,
      },
    ],
    totalAmount: Number,

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "pending",
    },

    remarks: String,

    placedAt: Date,
    approvedAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // FPO / Staff
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", OrderSchema);
