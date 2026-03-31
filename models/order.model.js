import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },
        quantity: Number,
        expectedPrice: Number,
        finalPrice: {
          type: Number,
          default: null
        }
      },
    ],
    totalAmount: Number,

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SOLD"],
      default: "PENDING",
    },

    remarks: String,

    placedAt: Date,
    approvedAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }, // FPO / Staff

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null
    },

    discountAmount: {
      type: Number,
      default: 0
    },

    finalAmount: {
      type: Number,
      default: 0
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "CREDIT"],
      default: "CASH",
      required: true
    },

    creditDays: {
      type: Number,
      default: 0
    },

    dueDate: {
      type: Date,
      default: null
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", OrderSchema);
