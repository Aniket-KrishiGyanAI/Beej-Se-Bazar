import { CropDoctor } from "../models/cropDoctor.model.js";
import { uploadToS3 } from "../utils/s3Upload.js";
import { deleteFromS3 } from "../utils/s3Delete.js";

// save report
const saveReport = async (req, res) => {
  try {
    const { diagnosis } = req.body;
    const userId = req.user._id;

    if (!diagnosis) {
      return res.status(400).json({
        status: "error",
        message: "Diagnosis is required",
      });
    }

    let imagePath = null;

    if (req.body.diagnosisImage && req.body.diagnosisImage.startsWith("data:")) {
      try {
        const base64Data = req.body.diagnosisImage.split(",")[1];
        const mimeType = req.body.diagnosisImage.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];

        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `diagnosis_${Date.now()}.${extension}`;

        const mockFile = {
          buffer,
          originalname: fileName,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "diagnosisImage",
        };

        const uploaded = await uploadToS3(mockFile, userId);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        imagePath = uploaded;

      } catch (error) {
        return res.status(400).json({
          status: "error",
          message: "Invalid image format: " + error.message,
        });
      }
    }

    else if (req.files && req.files.diagnosisImage?.length) {
      const uploaded = await uploadToS3(
        req.files.diagnosisImage[0],
        userId
      );

      if (!uploaded.url) {
        uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
      }

      imagePath = uploaded;
    }
    const newReport = await CropDoctor.create({
      userId,
      diagnosis,
      image: imagePath,
    });

    return res.status(201).json({
      status: "success",
      message: "Report created successfully",
      data: newReport,
    });
  } catch (error) {
    return res.status(500).json({
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
      return res.status(400).json({
        status: "error",
        message: "Report ID is required",
      });
    }

    const report = await CropDoctor.findById(reportId);

    if (!report) {
      return res.status(404).json({
        status: "error",
        message: "Report not found",
      });
    }

    if (report.image?.key) {
      try {
        await deleteFromS3(report.image.key);
      } catch (err) {
        console.error("Failed to delete S3 image:", err.message);
      }
    }

    await CropDoctor.findByIdAndDelete(reportId);

    return res.status(200).json({
      status: "success",
      message: "Report deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export { saveReport, getReports, getReportById, deleteReport };
