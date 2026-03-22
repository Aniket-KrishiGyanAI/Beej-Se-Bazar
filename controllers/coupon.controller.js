import { Coupon } from "../models/coupon.model.js";

const addCoupon = async (req, res) => {
    try {
        if (req.user.role !== "FPO") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only admin can create coupons",
            });
        }

        const {
            code,
            discountType,
            discountValue,
            maxDiscount,
            minOrderAmount,
            validFrom,
            validUntil,
        } = req.body;

        if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing",
            });
        }

        if (discountType === "PERCENTAGE" && discountValue > 100) {
            return res.status(400).json({
                success: false,
                message: "Percentage discount cannot exceed 100%",
            });
        }

        // prevent duplicate coupon
        const existingCoupon = await Coupon.findOne({ code });

        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists",
            });
        }

        const newCoupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            maxDiscount: maxDiscount || null,
            minOrderAmount: minOrderAmount || 0,
            validFrom,
            validUntil,
            isActive: true,
        });

        await newCoupon.save();

        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            data: newCoupon,
        });
    } catch (error) {
        console.error("Add coupon error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const updateCoupon = async (req, res) => {
    try {
        if (req.user.role !== "FPO") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only FPO can update coupons",
            });
        }

        const { id } = req.params;
        const updateData = req.body;

        if (updateData.code) {
            updateData.code = updateData.code.toUpperCase();
        }

        const existingCoupon = await Coupon.findOne({
            code: updateData.code,
            _id: { $ne: id },
        });

        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: "Coupon code already exists",
            });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: Date.now() },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            data: updatedCoupon,
        });
    } catch (error) {
        console.error("Update coupon error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const deleteCoupon = async (req, res) => {
    try {
        if (req.user.role !== "FPO") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only FPO can delete coupons",
            });
        }
        const { id } = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(id);
        if (!deletedCoupon) {
            return res.status(404).json({
                success: false,
                message: "Coupon not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "Coupon deleted successfully",
            data: deletedCoupon,
        });
    } catch (error) {
        console.error("Delete coupon error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getAllCoupons = async (req, res) => {
    try {
        
        if(req.user.role !== "FPO") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only FPO can view coupons",
            });
        }
        
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: coupons.length,
            data: coupons,
        });
    } catch (error) {
        console.error("Get all coupons error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export { addCoupon, updateCoupon, deleteCoupon, getAllCoupons };