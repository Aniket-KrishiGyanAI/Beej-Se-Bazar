import express from "express";
import {
  getInventoryItems,
  getInventoryStocks,
  getStockByItemId,
} from "../controllers/inventory.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/get-all-items", getInventoryItems);
router.get("/stocks", protect, getInventoryStocks);
router.get("/stock/:itemId", protect, getStockByItemId);

export default router;
