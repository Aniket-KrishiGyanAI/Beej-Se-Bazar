import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purchaseId: {
      type: String,
      required: true,
      unique: true,
    },
    crops: [
      {
        cropName: {
          type: String,
          required: true,
        },
        variety: {
          type: String,
          required: false,
        },
        rate: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      }
    ],
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
    totalAmount: {
      type: Number,
      required: true
    },
    previousDues: {
      type: Number,
      required: false,
      default: 0
    }
  },
  { timestamps: true }
);

export const Purchase = mongoose.model("Purchase", purchaseSchema);
