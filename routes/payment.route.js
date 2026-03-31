import express from "express";
import { farmerPayment, fpoPayment } from "../controllers/payment.controller";
import { protect } from "../middlewares/auth";

const router = express.Router();

router.post("/farmer-payment", protect, farmerPayment);
router.post("/fpo-payment", protect, fpoPayment);
router.get("/balance", protect, getFarmerBalance);

export default router;