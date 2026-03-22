import express from "express";
import {
    sendBroadcast,
    getBroadcastHistory,
    getBroadcastById,
    getBroadcastStats,
    getAllBroadcasts,
    getBroadcastDetailsPublic,
} from "../controllers/broadcast.controller.js";
import { upload } from "../middlewares/multer.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.use(protect);

// Send broadcast notification
router.post("/send", upload.fields([{ name: "broadcastImage", maxCount: 1 }]), sendBroadcast);

// broadcast statistics
router.get("/stats", getBroadcastStats);

// broadcast history with pagination and filters
router.get("/history", getBroadcastHistory);

router.get("/admin/:id", getBroadcastById);

router.get("/", getAllBroadcasts);

router.get("/:id", getBroadcastDetailsPublic);

export default router;