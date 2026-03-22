import { Crop } from "../models/crop.model.js";
import { Farm } from "../models/farm.model.js";

// add farm
const addFarm = async (req, res) => {
  try {
    const { userId, farmName, farmArea, unit, geojson } = req.body;

    if (!userId || !farmName || !farmArea || !unit || !geojson) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Check if farm name already exists for this user (case-insensitive)
    const farmExists = await Farm.exists({
      userId,
      farmName: { $regex: new RegExp(`^${farmName}$`, "i") },
    });

    if (farmExists) {
      return res.status(400).json({
        success: false,
        message: `Farm "${farmName}" already exists for this user.`,
      });
    }

    // Create and save the new farm
    const farm = await Farm.create({
      userId,
      farmName,
      farmArea,
      unit,
      geojson,
    });

    res.status(200).json({
      success: true,
      message: "Farm added successfully",
      data: farm,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error while adding farm",
      error: err.message,
    });
  }
};

// get farm by user id
const getFarmsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }

    const farms = await Farm.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Farms fetched successfully",
      data: farms,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// get farm by farm-id
const getFarmById = async (req, res) => {
  try {
    const { id } = req.params; // farm ID - param

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing farm ID" });
    }

    const farm = await Farm.findById(id);

    if (!farm) {
      return res
        .status(404)
        .json({ success: false, message: "Farm not found" });
    }

    res.status(200).json({
      success: true,
      message: "Farm fetched successfully",
      data: farm,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// update farm by id
const updateFarmById = async (req, res) => {
  try {
    const { id } = req.params; // farm id

    // Allowed fields for update
    const allowed = ["farmName", "farmArea", "unit", "geojson"];

    // Filter only allowed fields from req.body
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );

    const updatedFarm = await Farm.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );


    if (!updatedFarm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    res.json({
      success: true,
      message: "Farm updated successfully",
      data: updatedFarm,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// delete farm by id
const deleteFarmById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the farm first
    const farm = await Farm.findById(id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found",
      });
    }

    // Delete all user crops associated with this farm
    const deletedCrops = await Crop.deleteMany({
      farmId: id,
      userId: farm.userId,
    });

    // Delete the farm
    await Farm.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Farm and ${deletedCrops.deletedCount} related crop(s) deleted successfully`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error while deleting farm and its crops",
      error: err.message,
    });
  }
};

// get all farms
const getAllFarms = async (req,res) => {
  try {
    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can get data of farms",
      });
    }

    const farms = await Farm.find().populate("userId", "firstName lastName phone").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Farms fetched successfully",
      count: farms.length,
      data: farms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while getting farms",
      error: err.message,
    });
  }
}

export {
  addFarm,
  getFarmsByUserId,
  getFarmById,
  updateFarmById,
  deleteFarmById,
  getAllFarms
};
