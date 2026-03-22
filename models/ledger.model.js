import mongoose from "mongoose";

const LedgerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["DEBIT", "CREDIT"]
    },
    amount: Number,
    referenceType: {
        type: String,
        enum: ["PROCUREMENT",
            "PROCUREMENT_PAYMENT",
            "SALE",
            "PAYMENT",
            "REFUND",
            "ADJUSTMENT"]
    },
    referenceId: mongoose.Schema.Types.ObjectId,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

export const Ledger = mongoose.model("Ledger", LedgerSchema);