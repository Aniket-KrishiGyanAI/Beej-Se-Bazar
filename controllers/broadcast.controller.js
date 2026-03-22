import { sendToTokens } from "../utils/notificationService.js";
import { Broadcast } from "../models/broadcast.model.js";
import { User } from "../models/user.model.js";
import { uploadToS3 } from "../utils/s3Upload.js";

const sendBroadcast = async (req, res) => {
  const userId = req.user._id;

  if (req.user.role !== "FPO") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized. Only FPO can send broadcasts",
    });
  }

  const { title, description, targetRole = "Farmer" } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  let image = null;

  // Handle broadcast image - both Base64 and FormData
  if (req.body.broadcastImage && req.body.broadcastImage.startsWith("data:")) {
    try {
      const base64Data = req.body.broadcastImage.split(",")[1];
      const mimeType = req.body.broadcastImage.split(";")[0].split(":")[1];
      const extension = mimeType.split("/")[1];

      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `broadcast_${Date.now()}.${extension}`;

      const mockFile = {
        buffer,
        originalname: fileName,
        mimetype: mimeType,
        size: buffer.length,
        fieldname: "broadcastImage",
      };

      const uploaded = await uploadToS3(mockFile, userId);

      // Ensure URL is present
      if (!uploaded.url) {
        uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
      }

      image = uploaded;

    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid broadcast image format: " + error.message,
      });
    }
  }
  // Handle FormData broadcast image
  else if (req.files && req.files.broadcastImage?.length) {
    const uploaded = await uploadToS3(req.files.broadcastImage[0], userId);

    // Ensure URL is present
    if (!uploaded.url) {
      uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
    }

    image = uploaded;
  }

  if (!["Farmer", "FPO", "Staff", "All"].includes(targetRole)) {
    return res.status(400).json({
      success: false,
      message: "Invalid targetRole. Must be 'Farmer', 'FPO', 'Staff', or 'All'",
    });
  }

  try {
    let query = {};
    if (targetRole === "Farmer") {
      query.role = "Farmer";
    } else if (targetRole === "FPO") {
      query.role = "FPO";
    } else if (targetRole === "Staff") {
      query.role = "Staff";
    }
    // if targetRole === "all", query stays empty (all users)

    // Get all users matching the role
    const targetUsers = await User.find(query).select("fcmTokens");

    // Flatten all FCM tokens from all users
    const allTokens = targetUsers.flatMap((user) => user.fcmTokens || []);

    // Filter out empty/invalid tokens AND remove duplicates
    const validTokens = [...new Set(allTokens.filter(
      (token) => token && token.trim() !== ""
    ))];

    if (validTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No FCM tokens found for ${targetRole === "All" ? "any users" : targetRole + "s"}`,
      });
    }

    console.log(
      `Sending broadcast to ${validTokens.length} tokens (${targetUsers.length} users)`
    );

    // Prepare notification payload
    const payload = {
      title,
      body: description,
      data: {
        type: "ADMIN_BROADCAST",
        title,
        description,
        image: image?.url || "",
        targetRole,
        timestamp: new Date().toISOString(),
      },
    };

    // Send notification via FCM to all tokens
    const response = await sendToTokens(validTokens, payload);

    // Determine status
    let status = "sent";
    if (response.failureCount === validTokens.length) {
      status = "failed";
    } else if (response.failureCount > 0) {
      status = "partial";
    }

    // Save broadcast to database
    const broadcast = await Broadcast.create({
      sentBy: req.user._id,
      title,
      description,
      image: image || null,
      targetRole,
      recipientCount: validTokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      status,
      sentAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Broadcast sent successfully",
      data: {
        broadcast,
        stats: {
          totalTokens: validTokens.length,
          totalUsers: targetUsers.length,
          successCount: response.successCount,
          failureCount: response.failureCount,
        },
      },
    });
  } catch (error) {
    console.error("Broadcast error:", error);

    // Log failed broadcast
    try {
      await Broadcast.create({
        sentBy: req.user._id,
        title,
        description,
        image: image || null,
        targetRole,
        status: "failed",
        error: error.message,
      });
    } catch (dbError) {
      console.error("Failed to log broadcast error:", dbError);
    }

    res.status(500).json({
      success: false,
      message: "Failed to send broadcast",
      error: error.message,
    });
  }
};

const getBroadcastHistory = async (req, res) => {
  // Check authorization
  if (req.user.role !== "FPO") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const { page = 1, limit = 20, status, targetRole } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (targetRole) filter.targetRole = targetRole;

    const broadcasts = await Broadcast.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("sentBy", "firstName lastName phone")
      .lean();

    const total = await Broadcast.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: broadcasts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get broadcast history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch broadcast history",
      error: error.message,
    });
  }
};

const getBroadcastById = async (req, res) => {
  // Check authorization
  if (req.user.role !== "FPO") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findById(id)
      .populate("sentBy", "firstName lastName phone")
      .lean();

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: "Broadcast not found",
      });
    }

    res.status(200).json({
      success: true,
      data: broadcast,
    });
  } catch (error) {
    console.error("Get broadcast error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch broadcast",
      error: error.message,
    });
  }
};

const getBroadcastStats = async (req, res) => {
  if (req.user.role !== "FPO") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const totalBroadcasts = await Broadcast.countDocuments();
    const sentBroadcasts = await Broadcast.countDocuments({ status: "sent" });
    const failedBroadcasts = await Broadcast.countDocuments({
      status: "failed",
    });
    const partialBroadcasts = await Broadcast.countDocuments({
      status: "partial",
    });

    // Get total recipients
    const result = await Broadcast.aggregate([
      {
        $group: {
          _id: null,
          totalRecipients: { $sum: "$recipientCount" },
          totalSuccess: { $sum: "$successCount" },
          totalFailure: { $sum: "$failureCount" },
        },
      },
    ]);

    const stats = result[0] || {
      totalRecipients: 0,
      totalSuccess: 0,
      totalFailure: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        totalBroadcasts,
        sentBroadcasts,
        failedBroadcasts,
        partialBroadcasts,
        totalRecipients: stats.totalRecipients,
        totalSuccess: stats.totalSuccess,
        totalFailure: stats.totalFailure,
        successRate:
          stats.totalRecipients > 0
            ? ((stats.totalSuccess / stats.totalRecipients) * 100).toFixed(2)
            : 0,
      },
    });
  } catch (error) {
    console.error("Get broadcast stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch broadcast stats",
      error: error.message,
    });
  }
};

const getAllBroadcasts = async (req, res) => {
  try {
    const { page = 1, limit = 20, targetRole } = req.query;

    // Build filter - show broadcasts for user's role or 'all'
    const filter = {
      status: { $in: ["sent", "partial"] }, // Only show successfully sent broadcasts
    };

    // If user is farmer, show broadcasts targeted to farmers or all
    if (req.user.role === "Farmer") {
      filter.targetRole = { $in: ["Farmer", "All"] };
    }
    // If user is FPO, show broadcasts targeted to FPO or all
    else if (req.user.role === "FPO") {
      filter.targetRole = { $in: ["FPO", "All"] };
    }
    // If user is staff, show broadcasts targeted to staff or all
    else if (req.user.role === "Staff") {
      filter.targetRole = { $in: ["Staff", "All"] };
    }

    const broadcasts = await Broadcast.find(filter)
      .sort({ createdAt: -1 }) // Latest first
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("title description image targetRole sentAt createdAt")
      .lean();

    const total = await Broadcast.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: broadcasts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all broadcasts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch broadcasts",
      error: error.message,
    });
  }
};

const getBroadcastDetailsPublic = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findById(id)
      .select("title description image targetRole sentAt createdAt")
      .lean();

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: "Broadcast not found",
      });
    }

    // Check if user has access to this broadcast
    const userRole = req.user.role;
    const allowedRoles = ["All", userRole];

    if (!allowedRoles.includes(broadcast.targetRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this broadcast",
      });
    }

    res.status(200).json({
      success: true,
      data: broadcast,
    });
  } catch (error) {
    console.error("Get broadcast details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch broadcast details",
      error: error.message,
    });
  }
};

export {
  sendBroadcast,
  getBroadcastHistory,
  getBroadcastById,
  getBroadcastStats,
  getAllBroadcasts,
  getBroadcastDetailsPublic,
};