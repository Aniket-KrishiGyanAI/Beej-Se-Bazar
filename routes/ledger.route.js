import express from "express"
import { getAllLedgers, getLedger, getLedgerByReferenceType } from "../controllers/ledger.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/:id", protect, getLedger);
router.get("/", protect, getAllLedgers);
router.get("/reference/:type", protect, getLedgerByReferenceType);

export default router;