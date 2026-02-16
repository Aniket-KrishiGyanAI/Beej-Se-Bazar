import express from "express";
import {
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
  upload.single("diagnosisImage"),
  protect,
  saveReport
);
router.get("/getUserReports/:userId", getReports);
router.get("/getReportById/:reportId", getReportById);
router.delete("/deleteReport/:reportId", deleteReport);

export default router;
