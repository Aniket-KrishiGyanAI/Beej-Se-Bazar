import { CropDoctor } from "../models/cropDoctor.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// save report
const saveReport = async (req, res) => {
  try {
    const { diagnosis } = req.body;
    const userId = req.user._id;

    if (!diagnosis) {
      return res
        .status(400)
        .json({ status: "error", message: "Diagnosis is required" }); 
    }

    let imagePath = null;

    // 🚀 Upload to Cloudinary
    if (req.file) {
      const uploadResult = await uploadOnCloudinary(
        req.file.path,
        "diagnosisReports"
      );

      if (uploadResult) {
        imagePath = uploadResult.secure_url;
      }
    }

    const newReport = await CropDoctor.create({
      userId,
      diagnosis,
      image: imagePath,
    });

    res.status(201).json({
      status: "success",
      data: newReport,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// get previous reports
const getReports = async (req, res) => {
  try {
    const { userId } = req.params;

    const history = await CropDoctor.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({
      status: "success",
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// get single report
const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await CropDoctor.findById(reportId);

    if (!report) {
      return res.status(404).json({
        status: "error",
        message: "Report not found",
      });
    }
    res.json({
      status: "success",
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// delete the report
const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      return res
        .status(400)
        .json({ status: "error", message: "Report ID is required" });
    }

    const report = await CropDoctor.findByIdAndDelete(reportId);

    if (!report) {
      return res.status(404).json({
        status: "error",
        message: "Report not found",
      });
    }
    res.json({
      status: "success",
      message: "Report deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export { saveReport, getReports, getReportById, deleteReport };
