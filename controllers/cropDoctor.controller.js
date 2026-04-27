import { CropDoctor } from "../models/cropDoctor.model.js";
import { uploadToS3 } from "../utils/s3Upload.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in server environment variables!");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const getDynamicPrompt = (langCode) => {
  const langMap = {
    en: "English",
    hi: "Hindi",
    mr: "Marathi",
    te: "Telugu",
    gu: "Gujarati",
    bn: "Bengali",
    as: "Assamese",
    mni: "Manipuri",
    kn: "Kannada",
    ta: "Tamil",
    pa: "Punjabi",
    ml: "Malayalam",
  };

  const targetLanguage = langMap[langCode] || "English";

  return `Analyze this crop leaf image and identify any disease. You MUST provide the complete response EXCLUSIVELY in ${targetLanguage}. Do not use English unless the technical word has no translation. Format your response exactly in this plain text template without using markdown (no **, #, etc.):

DISEASE NAME:
[Determine the disease name]

SYMPTOMS:
[Symptom 1]
[Symptom 2]
[Symptom 3]

CAUSES:
[Explain what causes this disease]

TREATMENT:
[Treatment step 1]
[Treatment step 2]
[Treatment step 3]

RECOMMENDED CHEMICALS:
[Chemical/Fungicide/Pesticide name] - [Dosage and application]
[Chemical/Fungicide/Pesticide name] - [Dosage and application]

RECOMMENDED FERTILIZERS:
[Fertilizer name] - [NPK and application]

ORGANIC ALTERNATIVES:
[Organic solution 1]
[Organic solution 2]

PREVENTION:
[Prevention tip 1]
[Prevention tip 2]

Keep it simple, actionable, and STRICTLY in ${targetLanguage}. Provide specific chemical brands commonly available in India with exact dosages.`;
};

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

// analyze crop image
const analyzeCrop = async (req, res) => {
  try {
    // Validate input
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "No image file provided" });
    }

    const lang = req.body.lang || "en";

    // Convert uploaded file buffer to base64
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    // Build Gemini API request
    const contents = [
      { inlineData: { data: base64Image, mimeType } },
      { text: getDynamicPrompt(lang) },
    ];

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });

    const resultText =
      typeof response.text === "function" ? response.text() : response.text;

    if (!resultText) {
      return res
        .status(500)
        .json({ status: "error", message: "No diagnosis generated" });
    }

    return res.status(200).json({
      status: "success",
      diagnosis: resultText,
    });
  } catch (error) {
    console.error("Crop Doctor Analyze Error:", error.message);

    if (error.message?.includes("429")) {
      return res.status(429).json({
        status: "error",
        message: "Rate limit reached. Please try again later.",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Failed to analyze the image. Please try again.",
    });
  }
};

export { saveReport, getReports, getReportById, deleteReport, analyzeCrop };