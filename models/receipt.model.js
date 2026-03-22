import mongoose from "mongoose";

const ReceiptSchema = new mongoose.Schema({
    receiptNumber: {
        type: String,
        unique: true
    },

    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    },

    farmer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    items: [
        {
            itemName: String,
            quantity: Number,
            price: Number,
            amount: Number
        }
    ],

    subtotal: Number,
    discountAmount: Number,
    finalAmount: Number,

    paymentMethod: {
        type: String,
        enum: ["CASH", "UPI", "CREDIT", "OTHER"],
    },

    paidAt: Date,

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    creditDays: {
        type: Number,
        default: 0
    },

    dueDate: {
        type: Date,
        default: null
    },

    purchase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Purchase"
    },

    previousDues: {
        type: Number,
        default: 0
    },

    procuremnetDate: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

export const Receipt = mongoose.model("Receipt", ReceiptSchema);