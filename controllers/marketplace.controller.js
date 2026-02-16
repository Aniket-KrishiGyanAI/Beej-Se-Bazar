import { InventoryStock } from "../models/inventory.model.js";

const getMarketplaceItems = async (req, res) => {
  try {
    const stockItems = await InventoryStock.find({
      availableQuantity: { $gt: 0 },
    })
      .populate({
        path: "item",
        select: "itemName brand unit purchasePrice isActive sourceRef",
        populate: {
          path: "sourceRef",
          select: "productImage",
        },
      });

    const response = stockItems
      .filter((s) => s.item.isActive)
      .map((s) => ({
        itemId: s.item._id,
        itemName: s.item.itemName,
        brand: s.item.brand,
        unit: s.item.unit,
        availableQuantity: s.availableQuantity,

        // price logic
        price: s.lastSellRate ?? s.item.purchasePrice ?? null,

        // product image from Product
        productImage: s.item.sourceRef?.productImage ?? null,
      }));

    res.status(200).json({
      success: true,
      data: response,
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
