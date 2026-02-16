import { InventoryItem, InventoryStock } from "../models/inventory.model.js";

const getInventoryItems = async (req, res) => {
  try {
    const items = await InventoryItem.find(
      { isActive: true },
      {
        itemName: 1,
        brand: 1,
        unit: 1,
        purchasePrice: 1,
      }
    ).sort({ itemName: 1 });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getInventoryItemsBySearch = async (req, res) => {
  try {
    const { search } = req.query;
    const items = await InventoryItem.find(
      {
        $or: [
          { itemName: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
        ],
        isActive: true,
      },
      {
        itemName: 1,
        brand: 1,
        unit: 1,
        purchasePrice: 1,
      }
    ).sort({ itemName: 1 });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get all inventory stocks
const getInventoryStocks = async (req, res) => {
  try {
    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can fetch the inventory stocks",
      });
    }

    const items = await InventoryStock.find()
      .sort({
        itemName: 1,
      })
      .populate("item")
      .populate("lastUpdatedBy lastSellRate", "firstName lastName role");

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get stock by item id
const getStockByItemId = async (req, res) => {
  try {
    const { itemId } = req.params;

    const stock = await InventoryStock.findOne({ item: itemId }).populate({
      path: "item",
      select: "itemName brand unit purchasePrice",
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found for this item",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        itemId: stock.item._id,
        itemName: stock.item.itemName,
        brand: stock.item.brand,
        unit: stock.item.unit,
        availableQuantity: stock.availableQuantity,
        purchasePrice: stock.item.purchasePrice,
        lastSellRate: stock.lastSellRate,
      },
    });
  } catch (error) {
    console.error("Get stock by item error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  getInventoryItems,
  getInventoryItemsBySearch,
  getInventoryStocks,
  getStockByItemId,
};
