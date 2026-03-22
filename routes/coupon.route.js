import express from "express";
import { protect } from "../middlewares/auth.js";
import { addCoupon, deleteCoupon, getAllCoupons, updateCoupon } from "../controllers/coupon.controller.js";

const router = express.Router();

router.post("/add", protect, addCoupon);
router.put("/update/:id", protect, updateCoupon);
router.delete("/delete/:id", protect, deleteCoupon);
router.get("/get-all", protect, getAllCoupons);

export default router;