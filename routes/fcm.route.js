import express from "express"
import { saveFcmToken } from "../controllers/fcm.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router()

router.post("/save-token", protect, saveFcmToken); // save the token

export default router;