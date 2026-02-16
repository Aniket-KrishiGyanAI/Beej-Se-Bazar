import express from "express";
import { getAllOrders, placeOrder, updateOrderStatus } from "../controllers/order.controller.js";

import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/place", protect, placeOrder);
router.get("/allOrders", protect, getAllOrders);
router.put("/updateOrderStatus/:id", protect, updateOrderStatus);

export default router;
