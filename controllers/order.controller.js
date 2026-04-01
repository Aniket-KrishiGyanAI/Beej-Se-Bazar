import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { Ledger } from "../models/ledger.model.js";
import { Order } from "../models/order.model.js";
import { Receipt } from "../models/receipt.model.js";
import { User } from "../models/user.model.js";
import { sendToTokens } from "../utils/notificationService.js";
import PDFDocument from "pdfkit";
import { InventoryStock } from "../models/inventory.model.js";
import { Counter } from "../models/counter.model.js";
import path from "path";

const now = new Date();

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

const istDateTime = now.toLocaleString('en-IN', istOptions);

// generate order id
const generateOrderId = async (session = null) => {

  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { name: "orderId" },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      ...(session && { session })
    }
  );

  const sequence = String(counter.sequence || 1).padStart(4, "0");

  return `ORD-${year}-${sequence}`;
};

const placeOrder = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { paymentMethod } = req.body;

    const cart = await Cart.findOne({ farmer: farmerId })
      .populate({
        path: "items.item",
        select: "itemName brand unit purchasePrice",
      })
      .populate("coupon");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const orderItems = cart.items.map((item) => ({
      item: item.item._id,
      quantity: item.quantity,
      expectedPrice: item.expectedPrice,
    }));

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.expectedPrice * item.quantity,
      0
    );

    const discountAmount = cart.discountAmount || 0;

    const finalAmount = subtotal - discountAmount;

    const orderId = await generateOrderId();

    const newOrder = await Order.create({
      orderId,
      farmer: farmerId,
      items: orderItems,
      subtotal,
      discountAmount,
      finalAmount,
      coupon: cart.coupon || null,
      status: "PENDING",
      paymentMethod,
      placedAt: new Date(),
    });

    try {
      const admins = await User.find({ role: "FPO" });

      const adminTokens = admins.flatMap(
        (admin) => admin.fcmTokens || []
      );

      if (adminTokens.length > 0) {
        await sendToTokens(adminTokens, {
          title: "New Order",
          body: `A new order has been placed by a farmer`,
          data: {
            type: "NEW_ORDER",
            orderId: orderId,
          },
        });
      }
    } catch (notifyError) {
      console.error("FCM error:", notifyError);
    }

    await Cart.findOneAndDelete({ farmer: farmerId });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: newOrder,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    // Only FPO / Staff allowed
    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { status } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("farmer", "firstName lastName phone")
      .populate({
        path: "items.item",
        select: "itemName brand unit sourceRef",
        populate: {
          path: "sourceRef",
          select: "productImages"
        }
      })
      .populate({
        path: "coupon",
        select: "code discountType discountValue"
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });

  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// update order status + sell product + generate receipt + ledger entry
const updateOrderStatus = async (req, res) => {

  const session = await mongoose.startSession();

  try {

    session.startTransaction();

    if (req.user.role !== "FPO") {
      throw new Error("Unauthorized");
    }

    const { id } = req.params;
    const { status, sell, creditDays } = req.body;

    const order = await Order.findById(id)
      .populate("items.item")
      .session(session);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "SOLD") {
      throw new Error("Order already sold");
    }

    const updateData = { status };

    if (status === "APPROVED") {
      updateData.approvedBy = req.user._id;
      updateData.approvedAt = new Date();
    }

    if (status === "REJECTED") {
      updateData.approvedBy = null;
      updateData.approvedAt = null;
      return res.status(200).json({
        success: true,
        message: "Order rejected",
        data: await Order.findByIdAndUpdate(id, { $set: updateData }, { new: true, session })
      });
    }

    let receipt = null;

    // SELL PROCESS
    if (status === "APPROVED" && sell === true) {

      for (const item of order.items) {

        const stock = await InventoryStock.findOne({
          item: item.item._id
        }).session(session);

        if (!stock || stock.availableQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${item.item.itemName}`
          );
        }

        stock.availableQuantity -= item.quantity;
        stock.lastUpdatedBy = req.user._id;
        stock.lastUpdatedAt = new Date();

        await stock.save({ session });
      }

      updateData.status = "SOLD";

      // CREDIT LOGIC
      let dueDate = null;

      if (order.paymentMethod === "CREDIT" && creditDays) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + creditDays);
        updateData.creditDays = creditDays;
      }

      const receiptNumber = `RCPT-${Date.now()}`;

      const receiptItems = order.items.map(i => {
        const price = i.finalPrice ?? i.expectedPrice;

        if (price <= 0) {
          throw new Error(`Invalid price for ${i.item.itemName}`);
        }

        return {
          itemName: i.item.itemName,
          quantity: i.quantity,
          price,
          amount: price * i.quantity
        };
      });

      const totalAmount = receiptItems.reduce(
        (sum, i) => sum + i.amount,
        0
      );

      receipt = await Receipt.create([{
        receiptNumber,
        order: order._id,
        farmer: order.farmer,
        items: receiptItems,
        discountAmount: order.discountAmount,
        finalAmount: totalAmount,
        paymentMethod: order.paymentMethod,
        creditDays: creditDays || 0,
        dueDate,
        createdBy: req.user._id
      }], { session });

      const createdReceipt = receipt[0];

      await Ledger.create([{
        user: createdReceipt.farmer,
        type: "DEBIT",
        amount: createdReceipt.finalAmount,
        referenceType: "SALE",
        referenceId: createdReceipt._id,
        createdBy: req.user._id
      }], { session });

    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    // Send notification after commit
    const farmer = await User.findById(order.farmer);

    if (farmer?.fcmTokens?.length > 0) {
      sendToTokens(farmer.fcmTokens, {
        title: `Order ${updateData.status}`,
        body: `Your order has been ${updateData.status.toLowerCase()}`,
        data: {
          type: "ORDER_STATUS_UPDATE",
          orderId: updatedOrder._id.toString(),
          status: updateData.status,
        },
      }).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: "Order processed successfully",
      data: {
        order: updatedOrder,
        receipt: receipt ? receipt[0] : null
      }
    });

  } catch (error) {

    await session.abortTransaction();
    session.endSession();

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUserSpecificOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ farmer: userId })
      .populate({
        path: "items.item",
        select: "itemName brand unit",
      })
      .sort({ placedAt: -1 });
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// receipt generation
const generateReceipt = async (req, res) => {
  try {
    const { id } = req.params
    const { paymentMethod } = req.body;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can generate receipts",
      });
    }

    const order = await Order.findById(id)
      .populate("items.item");

    const receipt = await Receipt.create({
      receiptNumber: `RCPT-${Date.now()}`,
      order: order._id,
      farmer: order.farmer,
      items: order.items.map(i => ({
        itemName: i.item.itemName,
        quantity: i.quantity,
        price: i.expectedPrice,
        amount: i.quantity * i.expectedPrice
      })),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      paymentMethod: paymentMethod,
      paidAt: new Date(),
      createdBy: req.user._id
    });

    await Ledger.create({
      user: receipt.farmer._id,
      type: "DEBIT",
      amount: receipt.finalAmount,
      referenceType: "ORDER",
      referenceId: receipt._id,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: "Receipt generated successfully",
      data: receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await Receipt.findById(id)
      .populate("order")
      .populate("farmer", "firstName lastName phone")
      .populate("createdBy", "firstName lastName");

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found"
      });
    }

    res.status(200).json({
      success: true,
      data: receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

const getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find()
      .populate("order")
      .populate("farmer", "firstName lastName phone")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: receipts.length,
      data: receipts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

const generateReceiptPDF = (receipt, res) => {
  const doc = new PDFDocument({ margin: 40 });
  doc.font(path.join(process.cwd(), "fonts/NotoSansDevanagari.ttf"));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=receipt-${receipt.receiptNumber}.pdf`
  );

  doc.pipe(res);

  // HEADER
  doc
    .fontSize(18)
    .text("BEEJ SE BAZAR", { align: "center" })
    .fontSize(14)
    .text("SALES RECEIPT", { align: "center" })
    .moveDown();

  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // Receipt Info
  doc
    .fontSize(11)
    .text(`Receipt No: ${receipt.receiptNumber}`)
    .text(`Date: ${istDateTime}`)
    .moveDown();

  // Farmer Info
  doc
    .fontSize(13)
    .text("Bill To", { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(11)
    .text(`Name : ${receipt.farmer.firstName} ${receipt.farmer.lastName}`)
    .text(`Phone: ${receipt.farmer.phone}`)
    .text(`Payment Method: ${receipt.paymentMethod}`)
    .text(`Credit Days: ${receipt.creditDays} days`)
    .moveDown();

  // ORDER INFO
  doc
    .fontSize(13)
    .text("Order Information", { underline: true })
    .moveDown(0.5);

  doc
    .fontSize(11)
    .text(`Order ID: ${receipt.order.orderId}`)
    .text(`Status  : ${receipt.order.status}`)
    .moveDown();

  // ITEMS TABLE
  doc
    .fontSize(13)
    .text("Items", { underline: true })
    .moveDown(0.5);

  const tableTop = doc.y;

  const colItem = 40;
  const colQty = 320;
  const colPrice = 390;
  const colAmount = 470;

  doc.fontSize(11)
    .text("Item", colItem, tableTop)
    .text("Qty", colQty, tableTop)
    .text("Price", colPrice, tableTop)
    .text("Amount", colAmount, tableTop);

  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let y = tableTop + 25;

  receipt.items.forEach(item => {
    doc
      .text(item.itemName, colItem, y)
      .text(item.quantity.toString(), colQty, y)
      .text(`${item.price}`, colPrice, y)
      .text(`${item.amount}`, colAmount, y);

    y += 20;
  });

  doc.moveTo(40, y).lineTo(550, y).stroke();

  // PAYMENT SUMMARY BOX
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
    .text("Discount", labelX, summaryStart + 30)
    .text(`${receipt.discountAmount} Rs`, valueX, summaryStart + 30)

    .text("Total Amount", labelX, summaryStart + 50)
    .text(`${receipt.finalAmount} Rs`, valueX, summaryStart + 50)

    .text("Payment Method", labelX, summaryStart + 70)
    .text(`${receipt.paymentMethod}`, valueX, summaryStart + 70);

  doc.end();
};

const downloadReceipt = async (req, res) => {
  try {

    const { id } = req.params;

    if (req.user.role !== "FPO" && req.user.role !== "Staff" && req.user.role !== "Farmer") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can download receipts",
      });
    }

    const receipt = await Receipt.findById(id)
      .populate("order")
      .populate("farmer")
      .populate("createdBy");

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    generateReceiptPDF(receipt, res);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateOrderPrices = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (req.user.role !== "FPO") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // update only provided items
    for (const updatedItem of items) {
      const orderItem = order.items.find(
        (i) => i.item.toString() === updatedItem.itemId
      );

      if (orderItem) {
        if (updatedItem.finalPrice <= 0) {
          throw new Error("Invalid price - price must be greater than 0");
        }

        if (updatedItem.finalPrice >= orderItem.item.expectedPrice) {
          throw new Error(
            `Invalid price - final price (${updatedItem.finalPrice}) must be less than MRP (${orderItem.item.expectedPrice}) for ${orderItem.item.itemName}`
          );
        }

        orderItem.finalPrice = updatedItem.finalPrice;
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Prices updated successfully",
      data: order,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { placeOrder, getAllOrders, updateOrderStatus, getUserSpecificOrders, generateReceipt, getReceiptById, downloadReceipt, getAllReceipts, updateOrderPrices };