import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ["FARMER_TO_FPO", "FPO_TO_FARMER"],
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ["CASH", "UPI", "BANK"],
    default: "CASH"
  },

  referenceId: mongoose.Schema.Types.ObjectId,

  remarks: String,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true });

export const Payment = mongoose.model("Payment", PaymentSchema);