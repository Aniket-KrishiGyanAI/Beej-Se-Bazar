import express from "express";
import {
  addToCart,
  applyCoupon,
  clearCart,
  getMyCart,
  removeFromCart,
  updateCartItem,
} from "../controllers/cart.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/add", protect, addToCart);
router.get("/get-cart", protect, getMyCart);
router.put("/update", protect, updateCartItem);
router.delete("/remove/:itemId", protect, removeFromCart);
router.delete("/remove-all", protect, clearCart);
router.post("/apply-coupon", protect, applyCoupon);

export default router;
