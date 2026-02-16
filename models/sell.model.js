import mongoose from "mongoose";

const SellSchema = new mongoose.Schema(
  {
    // Buyer details
    buyerName: {
      type: String,
      required: true,
      trim: true,
    },

    buyerPhone: {
      type: String,
      default: null,
    },

    buyerAddress: {
      type: String,
      default: null,
    },

    buyerType: {
      type: String,
      enum: ["FARMER", "DEALER", "OTHER"],
      default: "OTHER",
    },

    // Sold items (MULTIPLE)
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        rate: {
          type: Number,
          required: true,
          min: 0,
        },

        amount: {
          type: Number,
          required: true,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    // Who sold
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    remarks: {
      type: String,
      default: null,
    },

    soldAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Sell = mongoose.model("Sell", SellSchema);
