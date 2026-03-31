import express from "express";
import { getAdminPrivateFiles, createStaff, createFPO } from "../controllers/admin.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/files/private", protect, getAdminPrivateFiles);

// Admin routes to create Staff and FPO accounts (Admin only)
router.post("/create-staff", protect, createStaff);
router.post("/create-fpo", protect, createFPO);

export default router;