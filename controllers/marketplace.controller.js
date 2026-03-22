import { InventoryStock } from "../models/inventory.model.js";

const getMarketplaceItems = async (req, res) => {
  try {
    const items = await InventoryStock.aggregate([
      {
        $match: {
          availableQuantity: { $gt: 0 },
        },
      },

      {
        $lookup: {
          from: "inventoryitems",
          localField: "item",
          foreignField: "_id",
          as: "item",
        },
      },

      { $unwind: "$item" },

      {
        $match: {
          "item.isActive": true,
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "item.sourceRef",
          foreignField: "_id",
          as: "product",
        },
      },

      { $unwind: "$product" },

      {
        $project: {
          _id: 0,
          itemId: "$item._id",
          itemName: "$item.itemName",
          brand: "$item.brand",
          unit: "$item.unit",
          availableQuantity: 1,

          price: {
            $ifNull: ["$lastSellRate", "$item.purchasePrice"],
          },

          expiryDate: "$item.expiryDate",

          // return ALL product images
          productImages: {
            $ifNull: ["$product.productImages.url", []],
          },
        },
      },

      {
        $sort: { itemName: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("Marketplace error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { getMarketplaceItems };
