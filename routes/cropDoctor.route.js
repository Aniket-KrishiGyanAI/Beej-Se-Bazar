import express from "express";
import {
  analyzeCrop,
  deleteReport,
  getReportById,
  getReports,
  saveReport,
} from "../controllers/cropDoctor.controller.js";
import { upload } from "../middlewares/multer.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/saveReport",
  upload.fields([{ name: "diagnosisImage", maxCount: 1 }]),
  protect,
  saveReport
);
router.get("/getUserReports/:userId", getReports);
router.get("/getReportById/:reportId", getReportById);
router.delete("/deleteReport/:reportId", deleteReport);
router.post("/analyze", upload.single("diagnosisImage"), analyzeCrop);

export default router;
