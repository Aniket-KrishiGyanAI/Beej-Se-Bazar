import { Purchase } from "../models/purchase.model.js";

// add purchase record
const addPurchase = async (req, res) => {
  try {
    const {
      farmer,
      crop,
      rate,
      quantity,
      procurementDate,
      procurementCenter,
      godown,
      vehicle,
      remarks,
    } = req.body;

    if (
      !farmer ||
      !crop ||
      rate === undefined ||
      quantity === undefined ||
      !procurementDate ||
      !procurementCenter
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (rate <= 0 || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rate and quantity must be greater than zero",
      });
    }

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can add purchase records",
      });
    }

    const newPurchase = await Purchase.create({
      farmer,
      crop,
      rate,
      quantity,
      procurementDate,
      procurementCenter,
      godown,
      vehicle,
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Purchase record added successfully",
      data: newPurchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update purchase record
const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      farmer,
      crop,
      rate,
      quantity,
      procurementDate,
      procurementCenter,
      godown,
      vehicle,
      remarks,
    } = req.body;

    const updatedData = {};

    if (farmer) updatedData.farmer = farmer;
    if (crop) updatedData.crop = crop;
    if (rate !== undefined) updatedData.rate = rate;
    if (quantity !== undefined) updatedData.quantity = quantity;
    if (procurementDate) updatedData.procurementDate = procurementDate;
    if (procurementCenter) updatedData.procurementCenter = procurementCenter;
    if (godown) updatedData.godown = godown;
    if (vehicle) updatedData.vehicle = vehicle;
    if (remarks) updatedData.remarks = remarks;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can update purchase records",
      });
    }

    // update the purchase record
    const purchase = await Purchase.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase record not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase record updated successfully",
      data: purchase,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// delete purchase record
const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can delete purchase records",
      });
    }

    const purchase = await Purchase.findByIdAndDelete(id);

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase record not found" });
    }

    res.status(200).json({
      success: true,
      message: "Purchase record deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get all purchase records
const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate("farmer", "firstName lastName")
      .populate("crop", "cropName season");
    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get purchase record by id
const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can view purchase records",
      });
    }

    const purchase = await Purchase.findById(id)
      .populate("farmer", "firstName lastName")
      .populate("crop", "cropName season");
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase record not found",
      });
    }
    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  addPurchase,
  updatePurchase,
  deletePurchase,
  getPurchases,
  getPurchaseById,
};
