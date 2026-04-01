import express from "express";
import { farmerPayment, fpoPayment, getFarmerBalance } from "../controllers/payment.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/farmer-payment", protect, farmerPayment);
router.post("/fpo-payment", protect, fpoPayment);
router.get("/balance", protect, getFarmerBalance);

export default router;