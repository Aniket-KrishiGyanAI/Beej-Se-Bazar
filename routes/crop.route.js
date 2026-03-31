import express from "express";
import {
  addCrop,
  deleteCropById,
  getCropsByUserId,
  getUserCropCalendar,
  updateCropById,
} from "../controllers/crop.controller.js";

import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/addCrop", protect, addCrop);
router.put("/updateCrop/:id", protect, updateCropById);
router.delete("/deleteCrop/:id", protect, deleteCropById);
router.get("/getCropsByUser", protect, getCropsByUserId);
router.get("/:userCropId/calendar", getUserCropCalendar);

export default router;
