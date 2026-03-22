// import { InventoryStock } from "../models/inventory.model.js";
// import { Sell } from "../models/sell.model.js";

// sell item
// const sellItems = async (req, res) => {
//   try {
//     const {
//       buyerName,
//       buyerPhone,
//       buyerAddress,
//       buyerType,
//       items, // Array [{ itemId, quantity, rate }]
//       remarks,
//     } = req.body;

//     if (!buyerName || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Buyer and items are required",
//       });
//     }

//     if (req.user.role !== "FPO" && req.user.role !== "Staff") {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized to sell items",
//       });
//     }

//     let totalAmount = 0;
//     const preparedItems = [];

//     // 1. Validate stock for ALL items
//     for (const i of items) {
//       const stock = await InventoryStock.findOne({ item: i.itemId });

//       if (!stock) {
//         return res.status(404).json({
//           success: false,
//           message: "Stock not found for one of the items",
//         });
//       }

//       if (stock.availableQuantity < i.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: "Insufficient stock for one of the items",
//         });
//       }

//       const amount = i.quantity * i.rate;
//       totalAmount += amount;

//       preparedItems.push({
//         item: i.itemId,
//         quantity: i.quantity,
//         rate: i.rate,
//         amount,
//       });
//     }

//     // 2. Deduct stock
//     for (const i of items) {
//       await InventoryStock.findOneAndUpdate(
//         { item: i.itemId },
//         {
//           $inc: { availableQuantity: -i.quantity },
//           lastSellRate: i.rate,
//           lastUpdatedBy: req.user._id,
//           lastUpdatedAt: new Date(),
//         }
//       );
//     }

//     // 3. Create sell record
//     const sellRecord = await Sell.create({
//       buyerName,
//       buyerPhone,
//       buyerAddress,
//       buyerType,
//       items: preparedItems,
//       totalAmount,
//       soldBy: req.user._id,
//       remarks,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Items sold successfully",
//       data: sellRecord,
//     });
//   } catch (error) {
//     console.error("Multi-item sell error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export { sellItems };
