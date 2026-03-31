import { User, Staff, FPO } from "../models/user.model.js";
import { generateSignedUrl } from "../utils/s3SignedUrl.js";
import bcrypt from "bcrypt";

const getAdminPrivateFiles = async (req, res) => {
  try {
    const { type, index, userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const ALLOWED_TYPES = [
      "soilHealthCard",
      "labReport",
      "govtSchemeDocs",
      "seedLicense",
      "fertilizerLicense",
      "procurementLicense",
      "GSTCertificate",
    ];

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    const user = await User.findById(userId).select(
      "soilHealthCard labReport govtSchemeDocs seedLicense fertilizerLicense procurementLicense GSTCertificate",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    if (req.user.role !== "FPO") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    let files = [];

    // Handle single files
    if (type !== "govtSchemeDocs") {
      if (!user[type]?.key) {
        return res.status(404).json({
          success: false,
          message: "File not found",
        });
      }
      files = [user[type]];
    }

    // Handle multiple files (govtSchemeDocs)
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

// Create Staff Account (Admin Only)
const createStaff = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender, emailId, joiningDate, village, district, state } = req.body;

    // Check admin role
    if (req.user.role !== "FPO") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create staff accounts",
      });
    }

    // Validate required fields
    if (!firstName || !lastName || !phone || !emailId || !joiningDate) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, phone, emailId, and joiningDate are required",
      });
    }

    // Validate phone format
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    // Check if email already exists
    const existingEmail = await Staff.findOne({ emailId });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email ID already in use",
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create staff account
    const staff = await Staff.create({
      firstName,
      lastName,
      phone,
      gender: gender || "other",
      emailId,
      joiningDate,
      village: village || "",
      district: district || "",
      state: state || "",
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Staff account created successfully",
      data: {
        id: staff._id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        emailId: staff.emailId,
        joiningDate: staff.joiningDate,
        role: staff.role,
        tempPassword: tempPassword, // Send to admin - they should share with staff securely
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create FPO Account (Admin Only)
const createFPO = async (req, res) => {
  try {
    const { firstName, lastName, phone, gender, shopName, emailId, gstNumber, village, district, state } = req.body;

    // Check admin role
    if (req.user.role !== "FPO") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create FPO accounts",
      });
    }

    // Validate required fields
    if (!firstName || !lastName || !phone || !emailId || !shopName || !gstNumber) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, phone, emailId, shopName, and gstNumber are required",
      });
    }

    // Validate phone format
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // Validate GST format (basic validation)
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(gstNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GST number format",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    // Check if email already exists
    const existingEmail = await FPO.findOne({ emailId });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email ID already in use",
      });
    }

    // Check if GST number already exists
    const existingGst = await FPO.findOne({ gstNumber });
    if (existingGst) {
      return res.status(409).json({
        success: false,
        message: "GST number already in use",
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create FPO account
    const fpo = await FPO.create({
      firstName,
      lastName,
      phone,
      gender: gender || "other",
      emailId,
      shopName,
      gstNumber,
      village: village || "",
      district: district || "",
      state: state || "",
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "FPO account created successfully",
      data: {
        id: fpo._id,
        firstName: fpo.firstName,
        lastName: fpo.lastName,
        phone: fpo.phone,
        emailId: fpo.emailId,
        shopName: fpo.shopName,
        gstNumber: fpo.gstNumber,
        role: fpo.role,
        tempPassword: tempPassword, // Send to admin - they should share with FPO securely
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { getAdminPrivateFiles, createStaff, createFPO };
