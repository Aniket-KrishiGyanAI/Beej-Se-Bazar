// import { Product } from "../models/product.model.js";
// import { Sell } from "../models/sell.model.js";

// const getMonthlyProductInventoryReport = async (req, res) => {
//   try {
//     const year = Number(req.query.year) || new Date().getFullYear();

//     // 🔹 INWARD (Product purchase)
//     const inward = await Product.aggregate([
//       {
//         $match: {
//           purchaseDate: {
//             $gte: new Date(`${year}-01-01`),
//             $lte: new Date(`${year}-12-31`),
//           },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             month: { $month: "$purchaseDate" },
//             productName: "$productName",
//             brand: "$brand",
//             unit: "$unit",
//           },
//           inwardQty: { $sum: "$quantity" },
//         },
//       },
//     ]);

//     // 🔹 OUTWARD (Sell)
//     const outward = await Sell.aggregate([
//       {
//         $match: {
//           createdAt: {
//             $gte: new Date(`${year}-01-01`),
//             $lte: new Date(`${year}-12-31`),
//           },
//         },
//       },
//       { $unwind: "$items" },
//       {
//         $lookup: {
//           from: "inventoryitems",
//           localField: "items.item",
//           foreignField: "_id",
//           as: "itemInfo",
//         },
//       },
//       { $unwind: "$itemInfo" },
//       {
//         $group: {
//           _id: {
//             month: { $month: "$createdAt" },
//             productName: "$itemInfo.itemName",
//             brand: "$itemInfo.brand",
//             unit: "$itemInfo.unit",
//           },
//           outwardQty: { $sum: "$items.quantity" },
//         },
//       },
//     ]);

//     // 🔹 Merge inward + outward
//     const reportMap = new Map();

//     inward.forEach((i) => {
//       const key = `${i._id.month}-${i._id.productName}-${i._id.brand}-${i._id.unit}`;
//       reportMap.set(key, {
//         month: i._id.month,
//         productName: i._id.productName,
//         brand: i._id.brand,
//         unit: i._id.unit,
//         inward: i.inwardQty,
//         outward: 0,
//       });
//     });

//     outward.forEach((o) => {
//       const key = `${o._id.month}-${o._id.productName}-${o._id.brand}-${o._id.unit}`;

//       if (reportMap.has(key)) {
//         reportMap.get(key).outward = o.outwardQty;
//       } else {
//         reportMap.set(key, {
//           month: o._id.month,
//           productName: o._id.productName,
//           brand: o._id.brand,
//           unit: o._id.unit,
//           inward: 0,
//           outward: o.outwardQty,
//         });
//       }
//     });

//     // Month name mapping
//     const monthNames = [
//       "",
//       "Jan",
//       "Feb",
//       "Mar",
//       "Apr",
//       "May",
//       "Jun",
//       "Jul",
//       "Aug",
//       "Sep",
//       "Oct",
//       "Nov",
//       "Dec",
//     ];

//     const result = Array.from(reportMap.values()).map((r) => ({
//       ...r,
//       month: monthNames[r.month],
//     }));

//     res.status(200).json({
//       success: true,
//       year,
//       count: result.length,
//       data: result,
//     });
//   } catch (error) {
//     console.error("Monthly product inventory report error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export { getMonthlyProductInventoryReport };    