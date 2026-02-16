import express from "express";
import { protect } from "../middlewares/auth.js";
import { sellItems } from "../controllers/sell.controller.js";

const router = express.Router();

router.post("/sell-items", protect, sellItems);

export default router;
