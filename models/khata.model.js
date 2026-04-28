import mongoose from "mongoose";

// Income Entry Schema
const incomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      default: "income",
      immutable: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Crop Sale", "Dairy", "Government Subsidy", "Other"],
    },
    productType: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
    },
    totalProduce: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      enum: ["KG", "Quintal", "Ton", "Litre", "Dozen", "Piece"],
      default: "KG",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Expense Entry Schema
const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      default: "expense",
      immutable: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Fertilizer",
        "Pesticide",
        "Seeds",
        "Labour",
        "Equipment",
        "Irrigation",
        "Transport",
        "Other",
      ],
    },
    productType: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
incomeSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, date: -1 })

export const Income = mongoose.model("Income", incomeSchema);
export const Expense = mongoose.model("Expense", expenseSchema);
