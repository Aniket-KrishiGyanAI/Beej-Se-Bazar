import { CropListing } from "../models/cropListing.model.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { uploadToS3 } from "../utils/s3Upload.js";

// add crop to crop listings
const addCropListing = async (req, res) => {
  try {
    const {
      cropName,
      variety,
      quantity,
      price,
      location,
      harvestDate,
      cropImages,
      userId,
    } = req.body;

    if (
      !cropName ||
      !variety ||
      quantity === undefined ||
      price === undefined ||
      !location ||
      !harvestDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (price <= 0 || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price and quantity must be greater than zero",
      });
    }

    // must have at least one image
    if (
      (!req.files || req.files.length === 0) &&
      (!Array.isArray(cropImages) || cropImages.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one crop image is required",
      });
    }

    // location parsing
    let coordinates;
    try {
      coordinates = Array.isArray(location) ? location : JSON.parse(location);

      if (
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        isNaN(coordinates[0]) ||
        isNaN(coordinates[1])
      ) {
        throw new Error();
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid location format. Use [longitude, latitude]",
      });
    }

    const uploadedImages = [];

    // MULTIPLE BASE64 IMAGES
    if (Array.isArray(cropImages)) {
      for (const base64Image of cropImages) {
        if (!base64Image.startsWith("data:")) continue;

        const base64Data = base64Image.split(",")[1];
        const mimeType = base64Image.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];

        const buffer = Buffer.from(base64Data, "base64");

        const mockFile = {
          buffer,
          originalname: `crop_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}.${extension}`,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "cropImages",
        };

        const uploaded = await uploadToS3(mockFile, req.user._id);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    // MULTIPLE FORM-DATA FILES
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadToS3(file, req.user._id);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    const newCropListing = new CropListing({
      userId: userId || req.user._id,
      cropName,
      variety,
      quantity,
      price,
      location: {
        type: "Point",
        coordinates,
      },
      harvestDate,
      cropImages: uploadedImages,
      createdBy: req.user._id,
    });

    await newCropListing.save();

    res.status(201).json({
      success: true,
      message: "Crop listing added successfully",
      data: newCropListing,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update crop from crop listings
const updateCropListing = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      cropName,
      variety,
      quantity,
      price,
      location,
      harvestDate,
      status,
      cropImages,
    } = req.body;

    const updateData = {};

    if (cropName) updateData.cropName = cropName;
    if (variety) updateData.variety = variety;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (price !== undefined) updateData.price = price;
    if (harvestDate) updateData.harvestDate = harvestDate;
    if (status) updateData.status = status;

    // location
    if (location) {
      let coordinates;
      try {
        coordinates = Array.isArray(location) ? location : JSON.parse(location);

        if (
          !Array.isArray(coordinates) ||
          coordinates.length !== 2 ||
          isNaN(coordinates[0]) ||
          isNaN(coordinates[1])
        ) {
          throw new Error();
        }
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid location format. Use [longitude, latitude]",
        });
      }

      updateData.location = {
        type: "Point",
        coordinates,
      };
    }

    const existingCrop = await CropListing.findById(id);
    if (!existingCrop) {
      return res.status(404).json({
        success: false,
        message: "Crop listing not found",
      });
    }

    const uploadedImages = [];

    // MULTIPLE BASE64 IMAGES
    if (Array.isArray(cropImages)) {
      for (const base64Image of cropImages) {
        if (!base64Image?.startsWith("data:")) continue;

        const base64Data = base64Image.split(",")[1];
        const mimeType = base64Image.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];

        const buffer = Buffer.from(base64Data, "base64");

        const mockFile = {
          buffer,
          originalname: `crop_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}.${extension}`,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "cropImages",
        };

        const uploaded = await uploadToS3(mockFile, req.user._id);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    // MULTIPLE FORM-DATA FILES
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadToS3(file, req.user._id);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    // replace images only if new ones uploaded
    if (uploadedImages.length > 0) {
      // delete old images from S3
      for (const img of existingCrop.cropImages || []) {
        if (img?.key) {
          await deleteFromS3(img.key);
        }
      }

      updateData.cropImages = uploadedImages;
    }

    const updatedCrop = await CropListing.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Crop listing updated successfully",
      data: updatedCrop,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// delete crop from crop listings
const deleteCropListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (req.user.role !== "Farmer" && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only farmer can delete crop listings",
      });
    }

    const deletedCropListing = await CropListing.findByIdAndDelete(id);

    if (!deletedCropListing) {
      return res.status(404).json({
        success: false,
        message: "Crop listing not found",
      });
    }

    // delete related images from S3
    if (
      deletedCropListing.cropImages &&
      Array.isArray(deletedCropListing.cropImages)
    ) {
      for (const image of deletedCropListing.cropImages) {
        if (image?.key) await deleteFromS3(image.key);
      }
    }

    res.status(200).json({
      success: true,
      message: "Crop listing deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCropListings = async (req, res) => {
  try {
    const cropListings = await CropListing.find().populate(
      "userId",
      "firstName lastName village",
    );
    res.status(200).json({
      success: true,
      count: cropListings.length,
      data: cropListings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCropListingsByUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const cropListings = await CropListing.find({ userId });
    res.status(200).json({
      success: true,
      count: cropListings.length,
      data: cropListings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCropByCropId = async (req, res) => {
  try {
    const { id } = req.params;
    const crop = await CropListing.findById(id);
    res.status(200).json({
      success: true,
      data: crop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  addCropListing,
  updateCropListing,
  deleteCropListing,
  getCropListings,
  getCropListingsByUser,
  getCropByCropId,
};
