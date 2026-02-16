import express from "express";
import { getAdminPrivateFiles } from "../controllers/admin.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/files/private", protect, getAdminPrivateFiles);

export default router;