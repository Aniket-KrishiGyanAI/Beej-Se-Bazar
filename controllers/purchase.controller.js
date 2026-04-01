import mongoose from "mongoose";
import { Purchase } from "../models/purchase.model.js";
import { Ledger } from "../models/ledger.model.js";
import { Receipt } from "../models/receipt.model.js";
import PDFDocument from "pdfkit";
import path from "path";

const generatePurchaseId = async () => {
  const count = await Purchase.countDocuments();

  const year = new Date().getFullYear();

  const sequence = String(count + 1).padStart(4, "0");

  return `PR-${year}-${sequence}`;
};

// Format date and time in IST
const istOptions = {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
};

function getISTDateTime(timestamp) {
  return timestamp.toLocaleString('en-IN', istOptions);
}

// add purchase record
const addPurchase = async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      farmer,
      crops,
      procurementDate,
      procurementCenter,
      previousDues = 0,
      godown,
      vehicle,
      remarks
    } = req.body;

    if (!farmer || !crops || !procurementDate || !procurementCenter) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing"
      });
    }

    let cropTotal = 0;

    const receiptItems = crops.map(item => {
      const amount = item.rate * item.quantity;
      cropTotal += amount;

      return {
        itemName: item.crop,
        quantity: item.quantity,
        price: item.rate,
        amount
      };
    });

    // subtract previous dues
    const netPayable = cropTotal - previousDues;

    const purchaseId = await generatePurchaseId();

    const purchase = await Purchase.create([{
      farmer,
      purchaseId,
      crops,
      procurementDate,
      procurementCenter,
      godown,
      vehicle,
      remarks,
      previousDues,
      totalAmount: netPayable
    }], { session });

    const purchaseDoc = purchase[0];

    // create receipt
    const receipt = await Receipt.create([{
      receiptNumber: `RCPT-${Date.now()}`,
      purchase: purchaseDoc._id,
      farmer,
      items: receiptItems,
      subtotal: cropTotal,
      discountAmount: 0,
      finalAmount: netPayable,
      previousDues: previousDues,
      paymentMethod: "CREDIT",
      createdBy: req.user._id
    }], { session });

    // ledger entry
    await Ledger.create([{
      user: farmer,
      type: "CREDIT",
      amount: netPayable,
      referenceType: "PROCUREMENT",
      referenceId: purchaseDoc._id,
      createdBy: req.user._id
    }], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Purchase recorded successfully",
      data: {
        purchase: purchaseDoc,
        receipt: receipt[0]
      }
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// update purchase record
const updatePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const purchase = await Purchase.findById(id).session(session);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found"
      });
    }

    const {
      farmer,
      crops,
      procurementDate,
      procurementCenter,
      previousDues,
      godown,
      vehicle,
      remarks
    } = req.body;

    if (farmer) purchase.farmer = farmer;
    if (procurementDate) purchase.procurementDate = procurementDate;
    if (procurementCenter) purchase.procurementCenter = procurementCenter;
    if (previousDues !== undefined) purchase.previousDues = previousDues;
    if (godown) purchase.godown = godown;
    if (vehicle) purchase.vehicle = vehicle;
    if (remarks) purchase.remarks = remarks;

    const oldTotal = purchase.totalAmount;

    let newTotal = oldTotal;

    if (crops) {

      let totalAmount = 0;

      crops.forEach(item => {
        const amount = item.rate * item.quantity;
        totalAmount += amount;
      });

      const dues = previousDues !== undefined ? previousDues : purchase.previousDues;

      totalAmount = totalAmount - dues;

      purchase.crops = crops;
      purchase.totalAmount = totalAmount;

      newTotal = totalAmount;
    }

    await purchase.save({ session });

    // Update Receipt
    const receipt = await Receipt.findOne({ purchase: purchase._id }).session(session);

    if (receipt && crops) {

      const items = crops.map(item => ({
        itemName: item.crop,
        quantity: item.quantity,
        price: item.rate,
        amount: item.rate * item.quantity
      }));

      receipt.items = items;
      receipt.subtotal = newTotal;
      receipt.finalAmount = newTotal;

      await receipt.save({ session });
    }

    // Ledger adjustment
    const difference = newTotal - oldTotal;

    if (difference !== 0) {

      await Ledger.create([{
        user: purchase.farmer,
        type: difference > 0 ? "CREDIT" : "DEBIT",
        amount: Math.abs(difference),
        referenceType: "ADJUSTMENT",
        referenceId: purchase._id,
        createdBy: req.user._id
      }], { session });

    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      data: purchase
    });

  } catch (error) {

    await session.abortTransaction();

    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
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
    const { page = 1, limit = 10, farmer } = req.query;
    const query = {};

    // optional farmer filter
    if (farmer) {
      query.farmer = farmer;
    }

    const purchases = await Purchase.find(query)
      .populate("farmer", "firstName lastName")
      .sort({ procurementDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Purchase.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: purchases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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
      .populate("farmer", "firstName lastName");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase record not found",
      });
    }

    // fetch receipt related to this purchase
    const receipt = await Receipt.findOne({ purchase: id })
      .select("receiptNumber items subtotal finalAmount paymentMethod");

    res.status(200).json({
      success: true,
      data: {
        purchase,
        receipt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// generate procurement receipt PDF
const generateProcurementReceiptPDF = (purchase, farmer, res) => {

  const doc = new PDFDocument({ margin: 40 });

  doc.font(path.join(process.cwd(), "fonts/NotoSansDevanagari.ttf"));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=procurement-${purchase.purchaseId}.pdf`
  );

  doc.pipe(res);

  // HEADER
  doc
    .fontSize(18)
    .text("BEEJ SE BAZAR", { align: "center" })
    .fontSize(14)
    .text("PROCUREMENT RECEIPT", { align: "center" })
    .moveDown();

  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  doc
    .fontSize(11)
    .text(`Receipt ID: ${purchase.purchaseId}`)
    .text(`Date: ${getISTDateTime(purchase.procurementDate)}`)
    .moveDown();

  // FARMER INFO
  doc
    .fontSize(13)
    .text("Farmer Details", { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(11)
    .text(`Name : ${farmer.firstName} ${farmer.lastName}`)
    .text(`Phone: ${farmer.phone}`)
    .moveDown();

  // PROCUREMENT INFO
  doc
    .fontSize(13)
    .text("Procurement Details", { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(11)
    .text(`Center : ${purchase.procurementCenter}`)
    .text(`Godown : ${purchase.godown || "-"}`)
    .text(`Vehicle: ${purchase.vehicle || "-"}`)
    .moveDown();

  // TABLE HEADER
  const tableTop = doc.y;

  const colCrop = 40;
  const colRate = 300;
  const colQty = 380;
  const colAmount = 470;

  doc
    .fontSize(11)
    .text("Crop", colCrop, tableTop)
    .text("Rate", colRate, tableTop)
    .text("Qty", colQty, tableTop)
    .text("Amount", colAmount, tableTop);

  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let y = tableTop + 25;
  let cropTotal = 0;

  purchase.crops.forEach(crop => {

    const amount = crop.rate * crop.quantity;
    cropTotal += amount;

    doc
      .text(crop.cropName, colCrop, y)
      .text(`${crop.rate}`, colRate, y)
      .text(`${crop.quantity}`, colQty, y)
      .text(`${amount}`, colAmount, y);

    y += 20;

  });

  doc.moveTo(40, y).lineTo(550, y).stroke();

  // SUMMARY
  const summaryStart = y + 30;

  const labelX = 350;
  const valueX = 470;

  doc
    .fontSize(12)
    .text("Payment Summary", labelX, summaryStart);

  doc
    .moveTo(labelX, summaryStart + 15)
    .lineTo(550, summaryStart + 15)
    .stroke();

  doc
    .fontSize(11)
    .text("Crop Total", labelX, summaryStart + 30)
    .text(`${cropTotal} Rs`, valueX, summaryStart + 30)

    .text("Previous Dues", labelX, summaryStart + 50)
    .text(`${purchase.previousDues || 0} Rs`, valueX, summaryStart + 50)

    .text("Net Payable", labelX, summaryStart + 70)
    .text(`${purchase.totalAmount} Rs`, valueX, summaryStart + 70);

  doc.end();
};

const getProcurementReceipt = async (req, res) => {
  try {

    const { id } = req.params;

    const purchase = await Purchase.findById(id)
      .populate("farmer", "firstName lastName phone");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found"
      });
    }

    // call PDF generator
    generateProcurementReceiptPDF(purchase, purchase.farmer, res);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export {
  addPurchase,
  updatePurchase,
  deletePurchase,
  getPurchases,
  getPurchaseById,
  getProcurementReceipt
};
