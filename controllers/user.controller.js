import bcrypt from "bcrypt";
import { User, Farmer, Staff, FPO } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { uploadToS3 } from "../utils/s3Upload.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { generateSignedUrl } from "../utils/s3SignedUrl.js";

const registerUser = async (req, res) => {
  try {
    const {
      role,
      firstName,
      lastName,
      phone,
      gender,
      password,
      village,
      district,
      state,
    } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    // Only allow Farmer registration through public endpoint
    if (role !== "Farmer") {
      return res.status(403).json({
        success: false,
        message: "Only Farmer registration is allowed through this endpoint. Contact admin to create Staff/FPO accounts.",
      });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;

    //! FARMER REGISTRATION
    user = await Farmer.create({
      firstName,
      lastName,
      phone,
      gender,
      password: hashedPassword,
      village,
      district,
      state,
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// sign-in user
const signInUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone is required",
      });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        village: user.village,
        district: user.district,
        state: user.state,
        farmerCategory: user.farmerCategory,
        cropsGrown: user.cropsGrown,
        landDetails: user.landDetails,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update user
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = {};

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (req.body.firstName) updateData.firstName = req.body.firstName;
    if (req.body.lastName) updateData.lastName = req.body.lastName;
    if (req.body.gender) updateData.gender = req.body.gender;
    if (req.body.village) updateData.village = req.body.village;
    if (req.body.state) updateData.state = req.body.state;
    if (req.body.district) updateData.district = req.body.district;

    // phone number validation
    if (req.body.phone) {
      const existingUser = await User.findOne({ phone: req.body.phone });
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res.status(409).json({
          success: false,
          message: "Phone number already in use",
        });
      }
      updateData.phone = req.body.phone;
    }

    // Handle profile image - both Base64 and FormData
    if (req.body.profileImage && req.body.profileImage.startsWith("data:")) {
      try {
        console.log("📸 Processing base64 profile image...");
        const base64Data = req.body.profileImage.split(",")[1];
        const mimeType = req.body.profileImage.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];

        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `profile_${Date.now()}.${extension}`;

        console.log("📦 Image details:", {
          fileName,
          mimeType,
          size: buffer.length,
        });

        const mockFile = {
          buffer,
          originalname: fileName,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "profileImage",
        };

        const uploaded = await uploadToS3(mockFile, userId);
        console.log("✅ S3 upload successful:", uploaded);

        // Ensure URL is present
        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        // Delete old profile image
        if (user.profileImage?.key) {
          console.log("🗑️ Deleting old profile image:", user.profileImage.key);
          await deleteFromS3(user.profileImage.key);
        }

        updateData.profileImage = uploaded;
      } catch (error) {
        console.error("❌ Base64 profile image processing error:", error);
        return res.status(400).json({
          success: false,
          message: "Invalid profile image format: " + error.message,
        });
      }
    }
    // Handle FormData profile image
    else if (req.files && req.files.profileImage?.length) {
      const uploaded = await uploadToS3(req.files.profileImage[0], userId);

      // Ensure URL is present
      if (!uploaded.url) {
        uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
      }

      if (user.profileImage?.key) {
        await deleteFromS3(user.profileImage.key);
      }

      updateData.profileImage = uploaded;
    }

    if (user.role === "Farmer") {
      if (req.body.farmerCategory)
        updateData.farmerCategory = req.body.farmerCategory;

      if (req.body.cropsGrown) updateData.cropsGrown = req.body.cropsGrown;
      if (req.body.landDetails) updateData.landDetails = req.body.landDetails;

      if (req.body.bankName) updateData.bankName = req.body.bankName;
      if (req.body.ifscCode) updateData.ifscCode = req.body.ifscCode;
      if (req.body.accountNumber)
        updateData.accountNumber = req.body.accountNumber;
    }

    if (user.role === "Staff") {
      if (req.body.emailId) updateData.emailId = req.body.emailId;
      if (req.body.joiningDate) updateData.joiningDate = req.body.joiningDate;
    }

    if (user.role === "FPO") {
      if (req.body.gstNumber) updateData.gstNumber = req.body.gstNumber;
      if (req.body.shopName) updateData.shopName = req.body.shopName;
      if (req.body.emailId) updateData.emailId = req.body.emailId;
    }

    // Farmer documents
    if (user.role === "Farmer" && req.files) {
      if (req.files.soilHealthCard?.length) {
        const uploaded = await uploadToS3(req.files.soilHealthCard[0], userId);

        if (user.soilHealthCard?.key) {
          await deleteFromS3(user.soilHealthCard.key);
        }

        updateData.soilHealthCard = uploaded;
      }

      if (req.files.labReport?.length) {
        const uploaded = await uploadToS3(req.files.labReport[0], userId);

        if (user.labReport?.key) {
          await deleteFromS3(user.labReport.key);
        }

        updateData.labReport = uploaded;
      }

      if (req.files.govtSchemeDocs?.length) {
        const newDocs = [];

        for (const file of req.files.govtSchemeDocs) {
          newDocs.push(await uploadToS3(file, userId));
        }

        if (Array.isArray(user.govtSchemeDocs)) {
          for (const doc of user.govtSchemeDocs) {
            if (doc?.key) await deleteFromS3(doc.key);
          }
        }

        updateData.govtSchemeDocs = newDocs;
      }
    }

    // Handle base64 documents for Farmer
    if (user.role === "Farmer") {
      // Soil Health Card - single or array
      if (req.body.soilHealthCard) {
        const processBase64 = async (base64String) => {
          const base64Data = base64String.split(",")[1];
          const mimeType = base64String.split(";")[0].split(":")[1];
          const extension = mimeType.split("/")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `soilHealthCard_${Date.now()}.${extension}`;

          return await uploadToS3(
            {
              buffer,
              originalname: fileName,
              mimetype: mimeType,
              size: buffer.length,
              fieldname: "soilHealthCard",
            },
            userId,
          );
        };

        try {
          if (Array.isArray(req.body.soilHealthCard)) {
            const uploaded = await processBase64(req.body.soilHealthCard[0]);
            if (user.soilHealthCard?.key)
              await deleteFromS3(user.soilHealthCard.key);
            updateData.soilHealthCard = uploaded;
          } else if (req.body.soilHealthCard.startsWith("data:")) {
            const uploaded = await processBase64(req.body.soilHealthCard);
            if (user.soilHealthCard?.key)
              await deleteFromS3(user.soilHealthCard.key);
            updateData.soilHealthCard = uploaded;
          }
        } catch (error) {
          console.error("❌ Soil Health Card error:", error.message);
        }
      }

      // Lab Report - single or array
      if (req.body.labReport) {
        const processBase64 = async (base64String) => {
          const base64Data = base64String.split(",")[1];
          const mimeType = base64String.split(";")[0].split(":")[1];
          const extension = mimeType.split("/")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `labReport_${Date.now()}.${extension}`;

          return await uploadToS3(
            {
              buffer,
              originalname: fileName,
              mimetype: mimeType,
              size: buffer.length,
              fieldname: "labReport",
            },
            userId,
          );
        };

        try {
          if (Array.isArray(req.body.labReport)) {
            const uploaded = await processBase64(req.body.labReport[0]);
            if (user.labReport?.key) await deleteFromS3(user.labReport.key);
            updateData.labReport = uploaded;
          } else if (req.body.labReport.startsWith("data:")) {
            const uploaded = await processBase64(req.body.labReport);
            if (user.labReport?.key) await deleteFromS3(user.labReport.key);
            updateData.labReport = uploaded;
          }
        } catch (error) {
          console.error("❌ Lab Report error:", error.message);
        }
      }

      // Government Scheme Docs - always array
      if (req.body.govtSchemeDocs) {
        try {
          const docsArray = Array.isArray(req.body.govtSchemeDocs)
            ? req.body.govtSchemeDocs
            : [req.body.govtSchemeDocs];

          const uploadedDocs = [];

          for (let i = 0; i < docsArray.length; i++) {
            const base64String = docsArray[i];
            if (base64String.startsWith("data:")) {
              const base64Data = base64String.split(",")[1];
              const mimeType = base64String.split(";")[0].split(":")[1];
              const extension = mimeType.split("/")[1];
              const buffer = Buffer.from(base64Data, "base64");
              const fileName = `govtSchemeDoc_${Date.now()}_${i}.${extension}`;

              const uploaded = await uploadToS3(
                {
                  buffer,
                  originalname: fileName,
                  mimetype: mimeType,
                  size: buffer.length,
                  fieldname: "govtSchemeDocs",
                },
                userId,
              );

              uploadedDocs.push(uploaded);
            }
          }

          if (uploadedDocs.length > 0) {
            if (Array.isArray(user.govtSchemeDocs)) {
              for (const doc of user.govtSchemeDocs) {
                if (doc?.key) await deleteFromS3(doc.key);
              }
            }
            updateData.govtSchemeDocs = uploadedDocs;
          }
        } catch (error) {
          console.error("❌ Govt Scheme Docs error:", error.message);
        }
      }
    }

    // FPO documents
    if (user.role === "FPO" && req.files) {
      if (req.files.seedLicense?.length) {
        const uploaded = await uploadToS3(req.files.seedLicense[0], userId);

        if (user.seedLicense?.key) {
          await deleteFromS3(user.seedLicense.key);
        }

        updateData.seedLicense = uploaded;
      }

      if (req.files.fertilizerLicense?.length) {
        const uploaded = await uploadToS3(req.files.fertilizerLicense[0], userId);

        if (user.fertilizerLicense?.key) {
          await deleteFromS3(user.fertilizerLicense.key);
        }

        updateData.fertilizerLicense = uploaded;
      }

      if (req.files.procurementLicense?.length) {
        const uploaded = await uploadToS3(req.files.procurementLicense[0], userId);

        if (user.procurementLicense?.key) {
          await deleteFromS3(user.procurementLicense.key);
        }

        updateData.procurementLicense = uploaded;
      }

      if (req.files.GSTCertificate?.length) {
        const uploaded = await uploadToS3(req.files.GSTCertificate[0], userId);

        if (user.GSTCertificate?.key) {
          await deleteFromS3(user.GSTCertificate.key);
        }

        updateData.GSTCertificate = uploaded;
      }
    }

    // Handle base64 documents for FPO
    if (user.role === "FPO") {
      // seed License - single
      if (req.body.seedLicense) {
        const processBase64 = async (base64String) => {
          const base64Data = base64String.split(",")[1];
          const mimeType = base64String.split(";")[0].split(":")[1];
          const extension = mimeType.split("/")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `seedLicense_${Date.now()}.${extension}`;

          return await uploadToS3(
            {
              buffer,
              originalname: fileName,
              mimetype: mimeType,
              size: buffer.length,
              fieldname: "seedLicense",
            },
            userId,
          );
        };

        try {
          if (req.body.seedLicense.startsWith("data:")) {
            const uploaded = await processBase64(req.body.seedLicense);
            if (user.seedLicense?.key) await deleteFromS3(user.seedLicense.key);
            updateData.seedLicense = uploaded;
          }
        } catch (error) {
          console.error("Seed License error:", error.message);
        }
      }

      // fertilizer License - single
      if (req.body.fertilizerLicense) {
        const processBase64 = async (base64String) => {
          const base64Data = base64String.split(",")[1];
          const mimeType = base64String.split(";")[0].split(":")[1];
          const extension = mimeType.split("/")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `fertilizerLicense_${Date.now()}.${extension}`;

          return await uploadToS3(
            {
              buffer,
              originalname: fileName,
              mimetype: mimeType,
              size: buffer.length,
              fieldname: "fertilizerLicense",
            },
            userId,
          );
        };

        try {
          if (req.body.fertilizerLicense.startsWith("data:")) {
            const uploaded = await processBase64(req.body.fertilizerLicense);
            if (user.fertilizerLicense?.key) await deleteFromS3(user.fertilizerLicense.key);
            updateData.fertilizerLicense = uploaded;
          }
        } catch (error) {
          console.error("Fertilizer License error:", error.message);
        }
      }
      
      // procurement License - single
      if (req.body.procurementLicense) {
        const processBase64 = async (base64String) => {
          const base64Data = base64String.split(",")[1];
          const mimeType = base64String.split(";")[0].split(":")[1];
          const extension = mimeType.split("/")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `procurementLicense_${Date.now()}.${extension}`;

          return await uploadToS3(
            {
              buffer,
              originalname: fileName,
              mimetype: mimeType,
              size: buffer.length,
              fieldname: "procurementLicense",
            },
            userId,
          );
        };

        try {
          if (req.body.procurementLicense.startsWith("data:")) {
            const uploaded = await processBase64(req.body.procurementLicense);
            if (user.procurementLicense?.key) await deleteFromS3(user.procurementLicense.key);
            updateData.procurementLicense = uploaded;
          }
        } catch (error) {
          console.error("Procurement License error:", error.message);
        }
      }

      // GST Certificate - single
      if (req.body.GSTCertificate) {
        const processBase64 = async (base64String) => {
          const base64Data = base64String.split(",")[1];
          const mimeType = base64String.split(";")[0].split(":")[1];
          const extension = mimeType.split("/")[1];
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `GSTCertificate_${Date.now()}.${extension}`;

          return await uploadToS3(
            {
              buffer,
              originalname: fileName,
              mimetype: mimeType,
              size: buffer.length,
              fieldname: "GSTCertificate",
            },
            userId,
          );
        };

        try {
          if (req.body.GSTCertificate.startsWith("data:")) {
            const uploaded = await processBase64(req.body.GSTCertificate);
            if (user.GSTCertificate?.key) await deleteFromS3(user.GSTCertificate.key);
            updateData.GSTCertificate = uploaded;
          }
        } catch (error) {
          console.error("GST Certificate error:", error.message);
        }
      }
    }

    let updatedUser;

    if (user.role === "Farmer") {
      updatedUser = await Farmer.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      );
    } else if (user.role === "Staff") {
      updatedUser = await Staff.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      );
    } else if (user.role === "FPO") {
      updatedUser = await FPO.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      );
    }

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    updatedUser = updatedUser.toObject();
    delete updatedUser.password; // remove password from response

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// logout user
const logoutUser = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

// delete user
const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id; // logged-in user id

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get user details
const getUserDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").lean();

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// view private file (user only)
const getUserPrivateFiles = async (req, res) => {
  try {
    const { type, index } = req.query;

    const ALLOWED_TYPES = [
      "soilHealthCard",
      "labReport",
      "govtSchemeDocs",
    ];

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    const user = await User.findById(req.user._id).select(
      "soilHealthCard labReport govtSchemeDocs"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
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
      }))
    );

    res.json({
      success: true,
      count: results.length,
      files: results,
      expiresIn: 600,
      type,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// get farmers
const getAllFarmers = async (req, res) => {
  try {
    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const farmers = await Farmer.find()
      .select("_id firstName lastName phone")
      .select("-password")
      .lean();
    if (!farmers || farmers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No farmers found",
      });
    }
    res.status(200).json({
      success: true,
      count: farmers.length,
      data: farmers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  registerUser,
  signInUser,
  updateProfile,
  logoutUser,
  deleteUser,
  getUserDetails,
  getAllUsers,
  getUserPrivateFiles,
  getAllFarmers,
};
