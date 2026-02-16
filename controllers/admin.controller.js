import { User } from "../models/user.model.js";
import { generateSignedUrl } from "../utils/s3SignedUrl.js";

const getAdminPrivateFiles = async (req, res) => {
  try {
    const { type, index, userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const ALLOWED_TYPES = ["soilHealthCard", "labReport", "govtSchemeDocs"];

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    const user = await User.findById(userId).select(
      "soilHealthCard labReport govtSchemeDocs",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    if(req.user.role !== 'FPO') {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    let files = [];

    // single files
    if (type !== "govtSchemeDocs") {
      if (!user[type]?.key) {
        return res.status(404).json({
          success: false,
          message: "File not found",
        });
      }
      files = [user[type]];
    }

    // multiple files
    if (type === "govtSchemeDocs") {
      if (!user.govtSchemeDocs?.length) {
        return res.status(404).json({
          success: false,
          message: "No documents found",
        });
      }

      files =
        index !== undefined
          ? [user.govtSchemeDocs[Number(index)]].filter(Boolean)
          : user.govtSchemeDocs;

      if (!files.length) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }
    }

    const results = await Promise.all(
      files.map(async (file, i) => ({
        index: i,
        contentType: file.contentType,
        size: file.size,
        uploadedAt: file.uploadedAt,
        url: await generateSignedUrl(file),
      })),
    );

    res.json({
      success: true,
      count: results.length,
      files: results,
      expiresIn: 600,
      type,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getAdminPrivateFiles };
