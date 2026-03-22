import express from "express";
import { downloadReceipt, generateReceipt, getAllOrders, getAllReceipts, getReceiptById, getUserSpecificOrders, placeOrder, updateOrderStatus } from "../controllers/order.controller.js";

import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/place", protect, placeOrder);
router.get("/allOrders", protect, getAllOrders);
router.put("/updateOrderStatus/:id", protect, updateOrderStatus);
router.get("/myOrders", protect, getUserSpecificOrders);
router.post("/generateReceipt/:id", protect, generateReceipt);
router.get("/receipt/:id", protect, getReceiptById);
router.get("/downloadReceipt/:id", protect, downloadReceipt);
router.get("/allReceipts", protect, getAllReceipts);

export default router;
