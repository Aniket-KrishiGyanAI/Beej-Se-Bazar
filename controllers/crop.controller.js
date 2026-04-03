import { Crop } from "../models/crop.model.js";
import { CropCalendar } from "../models/cropCalendar.model.js";
import { Farm } from "../models/farm.model.js";
import { generateCropData } from "../utils/cropCalenderData.js";
import { mapStagesToDates } from "../utils/dateMapper.js";

// add user crop
const addCrop = async (req, res) => {
  try {
    const { userId, farmId, cropName, area, unit, sowingDate } = req.body;

    if (!userId || !farmId || !cropName || !sowingDate) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (req.user.role !== "Farmer") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only Farmers can add crops",
      });
    }

    const numericArea = parseFloat(area);
    if (isNaN(numericArea) || numericArea <= 0) {
      return res.status(400).json({
        success: false,
        message: "Area must be a valid number greater than 0",
      });
    }

    if (!["acre", "hectare"].includes(unit)) {
      return res.status(400).json({
        success: false,
        message: "Unit must be either acre or hectare",
      });
    }

    const sowDate = new Date(sowingDate);
    if (isNaN(sowDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid sowing date",
      });
    }

    // ensure farm belongs to user
    const farm = await Farm.findOne({ _id: farmId, userId });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found for this user",
      });
    }

    const toAcre = (value, fromUnit) =>
      fromUnit === "hectare" ? parseFloat(value) * 2.47105 : parseFloat(value);

    const farmAreaAcre = toAcre(farm.farmArea, farm.unit);
    const newCropAreaAcre = toAcre(numericArea, unit);

    const existingCrops = await Crop.find({ farmId });

    const usedAreaAcre = existingCrops.reduce(
      (sum, crop) => sum + toAcre(crop.area, crop.unit),
      0,
    );

    const availableAcre = farmAreaAcre - usedAreaAcre;

    if (newCropAreaAcre > availableAcre) {
      return res.status(400).json({
        success: false,
        message: `Not enough available area.
Total: ${farmAreaAcre.toFixed(2)} Acre
Used: ${usedAreaAcre.toFixed(2)} Acre
Available: ${availableAcre.toFixed(2)} Acre`,
      });
    }

    const newCrop = await Crop.create({
      userId,
      farmId,
      cropName,
      area: numericArea,
      unit,
      sowingDate: sowDate,
    });

    return res.status(201).json({
      success: true,
      message: "Crop added successfully",
      data: newCrop,
    });
  } catch (error) {
    console.error("Add crop error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding crop",
    });
  }
};

// delete crop by id
const deleteCropById = async (req, res) => {
  try {
    const { id } = req.params;
    const crop = await Crop.findById(id);

    if (req.user.role !== "Farmer") {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized: Farmer only delete the crop",
      });
    }

    if (!crop) {
      return res.status(404).json({
        status: "error",
        message: "Crop not found",
      });
    }

    await Crop.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Crop deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error while deleting crop",
    });
  }
};

// get user crop by user id
const getCropsByUserId = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch user crops and populate farm and crop details
    const crops = await Crop.find({ userId })
      .populate({
        path: "farmId",
        select: "farmName farmArea unit",
      })
      .populate("userId", "firstName lastName")
      .sort({ createdAt: -1 }); // latest crops first

    return res.status(200).json({
      success: true,
      count: crops.length,
      data: crops,
    });
  } catch (error) {
    console.error("Get User Crops Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching user crops",
    });
  }
};

// update user crop by id
const updateCropById = async (req, res) => {
  try {
    const { id } = req.params;
    const { area, unit, cropName, sowingDate } = req.body;
    const userId = req.user._id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Crop id is required",
      });
    }

    if (req.user.role !== "Farmer") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only Farmers can update crops",
      });
    }

    const existingCrop = await Crop.findOne({ _id: id, userId });

    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: "Crop not found for this user",
      });
    }

    const farm = await Farm.findOne({
      _id: existingCrop.farmId,
      userId,
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found for this user",
      });
    }

    const toAcre = (value, fromUnit) =>
      fromUnit === "hectare" ? parseFloat(value) * 2.47105 : parseFloat(value);

    let newCropAreaAcre = null;

    if (area !== undefined) {
      const numericArea = parseFloat(area);
      if (isNaN(numericArea) || numericArea <= 0) {
        return res.status(400).json({
          success: false,
          message: "Area must be a valid number greater than 0",
        });
      }
      existingCrop.area = numericArea;
      newCropAreaAcre = toAcre(numericArea, unit || existingCrop.unit);
    }

    if (unit !== undefined) {
      if (!["acre", "hectare"].includes(unit)) {
        return res.status(400).json({
          success: false,
          message: "Unit must be either acre or hectare",
        });
      }
      existingCrop.unit = unit;
    }

    if (cropName !== undefined) {
      existingCrop.cropName = cropName.trim();
    }

    if (sowingDate !== undefined) {
      const sowDate = new Date(sowingDate);
      if (isNaN(sowDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid sowing date",
        });
      }
      existingCrop.sowingDate = sowDate;
    }

    if (area !== undefined || unit !== undefined) {
      const allCrops = await Crop.find({
        farmId: existingCrop.farmId,
        userId,
      });

      const usedAreaAcre = allCrops.reduce((sum, crop) => {
        if (crop._id.toString() !== id.toString()) {
          return sum + toAcre(crop.area, crop.unit);
        }
        return sum;
      }, 0);

      const farmAreaAcre = toAcre(farm.farmArea, farm.unit);
      const finalCropAreaAcre =
        newCropAreaAcre ?? toAcre(existingCrop.area, existingCrop.unit);

      const availableAcre = farmAreaAcre - usedAreaAcre;

      if (finalCropAreaAcre > availableAcre) {
        return res.status(400).json({
          success: false,
          message: `Not enough available area.
Total: ${farmAreaAcre.toFixed(2)} Acre
Used (other crops): ${usedAreaAcre.toFixed(2)} Acre
Available: ${availableAcre.toFixed(2)} Acre`,
        });
      }
    }

    await existingCrop.save();

    return res.status(200).json({
      success: true,
      message: "Crop updated successfully",
      data: existingCrop,
    });
  } catch (error) {
    console.error("Update crop error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating crop",
    });
  }
};

const getUserCropCalendar = async (req, res) => {
  const { userCropId } = req.params;

  try {
    // 1. Get user's crop record
    const userCrop = await Crop.findById(userCropId);
    if (!userCrop) {
      return res.status(404).json({ success: false, message: "Crop record not found." });
    }

    const cropName = userCrop.cropName.trim();
    const { sowingDate, area, unit, farmId } = userCrop;

    // 2. Get crop calendar template (DB first, then AI)
    let calendarTemplate = await CropCalendar.findOne({ crop_name_english: cropName });

    let source = "database";
    if (!calendarTemplate) {
      const aiData = await generateCropData(cropName);
      calendarTemplate = await CropCalendar.create(aiData);
      source = "";
    }

    // 3. Map relative days → actual calendar dates
    const stagesWithDates = mapStagesToDates(calendarTemplate.stages, sowingDate);

    // 4. Calculate harvest date and days remaining
    const totalDays = calendarTemplate.total_duration_days;
    const estimatedHarvestDate = new Date(sowingDate);
    estimatedHarvestDate.setDate(estimatedHarvestDate.getDate() + totalDays);

    const today = new Date();
    const daysElapsed = Math.floor((today - new Date(sowingDate)) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    // Find the currently active stage
    const currentStage = stagesWithDates.find((s) => s.status === "ongoing") || null;

    return res.status(200).json({
      success: true,
      source,
      data: {
        // User crop info
        userCropId,
        cropName: userCrop.cropName,
        farmId,
        area,
        unit,
        sowingDate,

        // Progress
        totalDays,
        daysElapsed: Math.max(0, daysElapsed),
        daysRemaining,
        progressPercent: Math.min(100, Math.round((daysElapsed / totalDays) * 100)),
        estimatedHarvestDate,

        // Current status
        currentStage: currentStage
          ? {
            stage_id: currentStage.stage_id,
            stage_name: currentStage.stage_name,
            category: currentStage.category,
            actualStartDate: currentStage.actualStartDate,
            actualEndDate: currentStage.actualEndDate,
          }
          : null,

        // General crop info
        scientific_name: calendarTemplate.scientific_name,
        crop_type: calendarTemplate.crop_type,
        harvest_indicators: calendarTemplate.harvest_indicators,
        expected_yield_per_hectare: calendarTemplate.expected_yield_per_hectare,
        storage: calendarTemplate.storage,

        // Full stages with real dates
        stages: stagesWithDates,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user crop calendar:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export { addCrop, deleteCropById, getCropsByUserId, updateCropById, getUserCropCalendar };
