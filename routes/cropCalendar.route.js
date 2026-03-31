import express from "express";

const router = express.Router();
import {
    getCropCalendar,
    getAllCrops,
    deleteCropCalendar,
} from "../controllers/cropCalendar.controller.js";

// GET all crops stored in DB
router.get("/", getAllCrops);

// GET crop calendar by name (DB first, then AI)
router.get("/:cropName", getCropCalendar);

// DELETE a crop (force re-generate next time)
router.delete("/:cropName", deleteCropCalendar);

export default router;