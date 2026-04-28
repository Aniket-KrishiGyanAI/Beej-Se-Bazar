import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { Income, Expense } from "../models/khata.model.js";

// ----------- Incomes ------------

// Add new income entry
const addIncome = async (req, res) => {
  try {
    const {
      userId,
      category,
      productType,
      date,
      totalProduce,
      unit,
      amount,
      reference,
    } = req.body;

    if (!userId || !category || !date || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, category, date, amount)",
      });
    }

    const income = new Income({
      userId,
      category,
      productType: productType || "",
      date,
      totalProduce: totalProduce || 0,
      unit: unit || "KG",
      amount,
      reference: reference || "",
    });

    await income.save();

    res.status(201).json({
      success: true,
      message: "Income entry added successfully",
      data: income,
    });
  } catch (err) {
    console.error("❌ Error adding income:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while adding income",
      error: err.message,
    });
  }
};

// Get all income entries for a user
const getIncomesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }

    const incomes = await Income.find({ userId }).sort({ date: -1 }).lean();

    res.status(200).json({
      success: true,
      message: "Income entries fetched successfully",
      data: incomes,
    });
  } catch (err) {
    console.error("Error fetching incomes:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// update the income entry
const updateIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await Income.findById(id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income entry not found",
      });
    }

    if (income.userId.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const {
      category,
      productType,
      date,
      totalProduce,
      unit,
      amount,
      reference,
    } = req.body;

    if (!category || !date || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (category, date, amount)",
      });
    }

    const updatedIncome = await Income.findByIdAndUpdate(id, {
      category,
      productType: productType || "",
      date,
      totalProduce: totalProduce || 0,
      unit: unit || "KG",
      amount,
      reference: reference || "",
    }, {
      new: true,
    });

    if (!updatedIncome) {
      return res.status(404).json({
        success: false,
        message: "Income entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Income entry updated successfully",
      data: updatedIncome,
    });
  } catch (err) {
    console.error("Error updating income:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating income",
      error: err.message,
    });
  }
};

// Delete an income entry
const deleteIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await Income.findById(id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income entry not found",
      });
    }

    if (income.userId.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const deletedIncome = await Income.findByIdAndDelete(id);

    if (!deletedIncome) {
      return res.status(404).json({
        success: false,
        message: "Income entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Income entry deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting income:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting income",
      error: err.message,
    });
  }
};

// ----------- Expenses ------------

// Add new expense entry
const addExpense = async (req, res) => {
  try {
    const {
      userId,
      category,
      productType,
      date,
      amount,
      reference,
    } = req.body;

    if (!userId || !category || !date || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, category, date, amount)",
      });
    }

    const expense = new Expense({
      userId,
      category,
      productType: productType || "",
      date,
      amount,
      reference: reference || "",
    });

    await expense.save();

    res.status(201).json({
      success: true,
      message: "Expense entry added successfully",
      data: expense,
    });
  } catch (err) {
    console.error("❌ Error adding expense:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while adding expense",
      error: err.message,
    });
  }
};

// Get all expense entries for a user
const getExpensesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }

    const expenses = await Expense.find({ userId }).sort({ date: -1 }).lean();

    res.status(200).json({
      success: true,
      message: "Expense entries fetched successfully",
      data: expenses,
    });
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// update the expense entry
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense entry not found",
      });
    }
    if (expense.userId.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const {
      category,
      productType,
      date,
      amount,
      reference,
    } = req.body;

    if (!category || !date || !amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (category, date, amount)",
      });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(id, {
      category,
      productType: productType || "",
      date,
      amount,
      reference: reference || "",
    }, {
      new: true,
    });

    if (!updatedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense entry updated successfully",
      data: updatedExpense,
    });
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating expense",
      error: err.message,
    });
  }
};

// Delete an expense entry
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense entry not found",
      });
    }
    if (expense.userId.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const deletedExpense = await Expense.findByIdAndDelete(id);

    if (!deletedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense entry not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense entry deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting expense",
      error: err.message,
    });
  }
};

// SUMMARY / DASHBOARD
// Get khata summary (total income, expense, profit)
const getKhataSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    const [incomeResult, expenseResult] = await Promise.all([
      Income.aggregate([
        { $match: { userId: objectUserId } },
        { $group: { _id: null, totalIncome: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId: objectUserId } },
        { $group: { _id: null, totalExpense: { $sum: "$amount" } } },
      ]),
    ]);

    const totalIncome = incomeResult.length > 0 ? incomeResult[0].totalIncome : 0;
    const totalExpense = expenseResult.length > 0 ? expenseResult[0].totalExpense : 0;
    const totalProfit = totalIncome - totalExpense;

    res.status(200).json({
      success: true,
      message: "Khata summary fetched successfully",
      data: {
        totalIncome,
        totalExpense,
        totalProfit,
      },
    });
  } catch (err) {
    console.error("Error fetching khata summary:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching summary",
      error: err.message,
    });
  }
};

// LEDGER (date-range filtered view)

// Get ledger details with date range filter
const getLedgerDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }

    const objectUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // Build date filter
    const dateFilter = {};
    if (startDate && !isNaN(new Date(startDate))) dateFilter.$gte = new Date(startDate);
    if (endDate && !isNaN(new Date(endDate))) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const dateQuery = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [incomes, expenses] = await Promise.all([
      Income.find({ userId: objectUserId, ...dateQuery }).sort({ date: -1 }).lean(),
      Expense.find({ userId: objectUserId, ...dateQuery }).sort({ date: -1 }).lean(),
    ]);

    // Merge and sort all entries by date (descending)
    const allEntries = [
      ...incomes.map((i) => ({ ...i, entryType: "income" })),
      ...expenses.map((e) => ({ ...e, entryType: "expense" })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Compute totals for the filtered range
    const totalIncome = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    res.status(200).json({
      success: true,
      message: "Ledger details fetched successfully",
      data: {
        entries: allEntries,
        totalIncome,
        totalExpense,
        totalProfit: totalIncome - totalExpense,
        count: allEntries.length,
      },
    });
  } catch (err) {
    console.error("Error fetching ledger details:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching ledger",
      error: err.message,
    });
  }
};

// PDF DOWNLOAD — generates and streams a PDF file to the client

// Helper: format date to readable string
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper: format currency
const formatCurrency = (amount) => {
  return `Rs. ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper: draw a simple table row
const drawTableRow = (doc, y, cells, colWidths, options = {}) => {
  const { bold = false, fillColor = null, textColor = "#333333" } = options;
  let x = 40;

  if (fillColor) {
    doc.rect(x, y - 2, colWidths.reduce((a, b) => a + b, 0), 20).fill(fillColor);
  }

  doc.fillColor(textColor);
  if (bold) doc.font("Helvetica-Bold");
  else doc.font("Helvetica");

  doc.fontSize(9);
  cells.forEach((cell, i) => {
    doc.text(String(cell ?? ""), x + 4, y + 2, {
      width: colWidths[i] - 8,
      height: 16,
      ellipsis: true,
    });
    x += colWidths[i];
  });

  return y + 20;
};

// Helper: draw a horizontal line
const drawLine = (doc, y, color = "#cccccc") => {
  doc.strokeColor(color).lineWidth(0.5).moveTo(40, y).lineTo(555, y).stroke();
  return y;
};

// Download Khata ledger as PDF
const getLedgerPDFData = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId" });
    }

    const objectUserId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    // Build date filter
    const dateFilter = {};
    if (startDate && !isNaN(new Date(startDate))) dateFilter.$gte = new Date(startDate);
    if (endDate && !isNaN(new Date(endDate))) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const dateQuery = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [incomes, expenses] = await Promise.all([
      Income.find({ userId: objectUserId, ...dateQuery }).sort({ date: 1 }).lean(),
      Expense.find({ userId: objectUserId, ...dateQuery }).sort({ date: 1 }).lean(),
    ]);

    const totalIncome = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalProfit = totalIncome - totalExpense;

    // Date range label
    const rangeFrom = startDate ? formatDate(startDate) : "All time";
    const rangeTo = endDate ? formatDate(endDate) : "Present";

    // ── Create PDF ──
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    // Set response headers for PDF download
    const filename = `Khata_Ledger_${rangeFrom.replace(/\s/g, "-")}_to_${rangeTo.replace(/\s/g, "-")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Pipe the PDF into the response
    doc.pipe(res);

    // ── Header ──
    doc.fillColor("#1B5E20").fontSize(22).font("Helvetica-Bold").text("Khata Receipt", 40, 40);
    doc.fillColor("#666666").fontSize(10).font("Helvetica").text(`Date Range: ${rangeFrom}  to  ${rangeTo}`, 40, 68);
    doc.text(`Generated on: ${formatDate(new Date())}`, 40, 82);

    drawLine(doc, 100, "#1B5E20");

    // ── Summary Section ──
    let y = 115;
    doc.fillColor("#1B5E20").fontSize(14).font("Helvetica-Bold").text("Summary", 40, y);
    y += 25;

    // Summary boxes
    const boxWidth = 160;
    const boxGap = 15;

    // Total Income box
    doc.roundedRect(40, y, boxWidth, 50, 5).fill("#E8F5E9");
    doc.fillColor("#2E7D32").fontSize(9).font("Helvetica").text("Total Income", 50, y + 8, { width: boxWidth - 20 });
    doc.fillColor("#1B5E20").fontSize(14).font("Helvetica-Bold").text(formatCurrency(totalIncome), 50, y + 26, { width: boxWidth - 20 });

    // Total Expense box
    doc.roundedRect(40 + boxWidth + boxGap, y, boxWidth, 50, 5).fill("#FFEBEE");
    doc.fillColor("#C62828").fontSize(9).font("Helvetica").text("Total Expense", 50 + boxWidth + boxGap, y + 8, { width: boxWidth - 20 });
    doc.fillColor("#B71C1C").fontSize(14).font("Helvetica-Bold").text(formatCurrency(totalExpense), 50 + boxWidth + boxGap, y + 26, { width: boxWidth - 20 });

    // Total Profit box
    const profitBg = totalProfit >= 0 ? "#E8F5E9" : "#FFEBEE";
    const profitColor = totalProfit >= 0 ? "#1B5E20" : "#B71C1C";
    doc.roundedRect(40 + 2 * (boxWidth + boxGap), y, boxWidth, 50, 5).fill(profitBg);
    doc.fillColor(totalProfit >= 0 ? "#2E7D32" : "#C62828").fontSize(9).font("Helvetica").text("Total Profit", 50 + 2 * (boxWidth + boxGap), y + 8, { width: boxWidth - 20 });
    doc.fillColor(profitColor).fontSize(14).font("Helvetica-Bold").text(formatCurrency(totalProfit), 50 + 2 * (boxWidth + boxGap), y + 26, { width: boxWidth - 20 });

    y += 70;

    // ── Income Table ──
    doc.fillColor("#1B5E20").fontSize(14).font("Helvetica-Bold").text("Income Entries", 40, y);
    y += 22;

    const incomeColWidths = [75, 90, 90, 70, 45, 80, 65];
    const incomeHeaders = ["Date", "Category", "Product", "Produce", "Unit", "Amount", "Ref"];

    y = drawTableRow(doc, y, incomeHeaders, incomeColWidths, {
      bold: true,
      fillColor: "#1B5E20",
      textColor: "#FFFFFF",
    });

    if (incomes.length === 0) {
      doc.fillColor("#999999").fontSize(10).font("Helvetica").text("No income entries found.", 44, y + 5);
      y += 25;
    } else {
      incomes.forEach((entry, index) => {
        // Add new page if running out of space
        if (y > 720) {
          doc.addPage();
          y = 40;
        }

        const bgColor = index % 2 === 0 ? "#F5F5F5" : null;
        y = drawTableRow(
          doc,
          y,
          [
            formatDate(entry.date),
            entry.category,
            entry.productType || "-",
            (entry.totalProduce !== undefined && entry.totalProduce !== null) ? entry.totalProduce : "-",
            entry.unit || "-",
            formatCurrency(entry.amount || 0),
            entry.reference || "-",
          ],
          incomeColWidths,
          { fillColor: bgColor }
        );
      });
    }

    drawLine(doc, y + 5);
    y += 8;
    doc.fillColor("#1B5E20").fontSize(10).font("Helvetica-Bold").text(`Total Income: ${formatCurrency(totalIncome)}`, 40, y + 5, { align: "right", width: 515 });
    y += 30;

    // ── Expense Table ──
    if (y > 650) {
      doc.addPage();
      y = 40;
    }

    doc.fillColor("#B71C1C").fontSize(14).font("Helvetica-Bold").text("Expense Entries", 40, y);
    y += 22;

    const expenseColWidths = [85, 110, 110, 100, 110];
    const expenseHeaders = ["Date", "Category", "Product", "Amount", "Reference"];

    y = drawTableRow(doc, y, expenseHeaders, expenseColWidths, {
      bold: true,
      fillColor: "#B71C1C",
      textColor: "#FFFFFF",
    });

    if (expenses.length === 0) {
      doc.fillColor("#999999").fontSize(10).font("Helvetica").text("No expense entries found.", 44, y + 5);
      y += 25;
    } else {
      expenses.forEach((entry, index) => {
        if (y > 720) {
          doc.addPage();
          y = 40;
        }

        const bgColor = index % 2 === 0 ? "#F5F5F5" : null;
        y = drawTableRow(
          doc,
          y,
          [
            formatDate(entry.date),
            entry.category,
            entry.productType || "-",
            formatCurrency(entry.amount || 0),
            entry.reference || "-",
          ],
          expenseColWidths,
          { fillColor: bgColor }
        );
      });
    }

    drawLine(doc, y + 5);
    y += 8;
    doc.fillColor("#B71C1C").fontSize(10).font("Helvetica-Bold").text(`Total Expense: ${formatCurrency(totalExpense)}`, 40, y + 5, { align: "right", width: 515 });

    // ── Footer ──
    y += 40;
    if (y > 720) {
      doc.addPage();
      y = 40;
    }
    drawLine(doc, y, "#1B5E20");
    doc.fillColor("#999999").fontSize(8).font("Helvetica").text("Generated by KrishiGyan AI - Khata Ledger System", 40, y + 8, { align: "center", width: 515 });

    // Finalize the PDF
    doc.end();
  } catch (err) {
    console.error("Error generating ledger PDF:", err);
    // Only send JSON error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Server error while generating PDF",
        error: err.message,
      });
    }
  }
};

export {
  addIncome,
  getIncomesByUserId,
  deleteIncome,
  updateIncome,
  addExpense,
  getExpensesByUserId,
  updateExpense,
  deleteExpense,
  getKhataSummary,
  getLedgerDetails,
  getLedgerPDFData,
};
