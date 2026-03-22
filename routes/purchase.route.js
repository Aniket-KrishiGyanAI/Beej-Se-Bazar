import express from "express";
import {
  addPurchase,
  deletePurchase,
  getProcurementReceipt,
  getPurchaseById,
  getPurchases,
  updatePurchase,
} from "../controllers/purchase.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/addPurchase", protect, addPurchase);
router.put("/updatePurchase/:id", protect, updatePurchase);
router.delete("/deletePurchase/:id", protect, deletePurchase);
router.get("/getPurchases", protect, getPurchases);
router.get("/getPurchaseById/:id", protect, getPurchaseById);
router.get("/receipt/:id", protect, getProcurementReceipt);

export default router;
