import express from "express";
import { 
  getMandiPrices, 
  getMyMandiPrices, 
  getAllMandiPrices 
} from "../controllers/mandiPrice.controller.js";

const router = express.Router();

router.get("/prices", getMandiPrices);           // Filter-based
router.get("/my-location", getMyMandiPrices);   // User's location
router.get("/all-pages", getAllMandiPrices);    // Paginated

export default router;