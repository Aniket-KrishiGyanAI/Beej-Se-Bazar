import express from "express";
import {
  addIncome,
  getIncomesByUserId,
  deleteIncome,
  addExpense,
  getExpensesByUserId,
  deleteExpense,
  getKhataSummary,
  getLedgerDetails,
  getLedgerPDFData,
  updateIncome,
  updateExpense,
} from "../controllers/khata.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

// ── Summary ──
router.get("/summary/:userId", getKhataSummary);

// ── Income ──
router.post("/income/add", addIncome);
router.get("/income/:userId", getIncomesByUserId);
router.delete("/income/:id", protect, deleteIncome);
router.put("/income/:id", protect, updateIncome);

// ── Expense ──
router.post("/expense/add", addExpense);
router.get("/expense/:userId", getExpensesByUserId);
router.delete("/expense/:id", protect, deleteExpense);
router.put("/expense/:id", protect, updateExpense);

// ── PDF data export (must be before /ledger/:userId to avoid param conflict) ──
router.get("/ledger/pdf/:userId", getLedgerPDFData);

// ── Ledger (date-range filtered) ──
router.get("/ledger/:userId", getLedgerDetails);

export default router;
