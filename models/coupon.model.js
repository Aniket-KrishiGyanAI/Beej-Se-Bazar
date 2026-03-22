import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },

  discountType: {
    type: String,
    enum: ["PERCENTAGE", "FLAT"],
    required: true,
  },

  discountValue: {
    type: Number,
    required: true,
  },

  maxDiscount: {
    type: Number,
    default: null, // useful for percentage coupons
  },

  minOrderAmount: {
    type: Number,
    default: 0,
  },

  validFrom: Date,
  validUntil: Date,

  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export const Coupon = mongoose.model("Coupon", CouponSchema);