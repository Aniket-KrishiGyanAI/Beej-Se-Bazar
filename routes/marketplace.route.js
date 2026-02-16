import express from "express";
import { getMarketplaceItems } from "../controllers/marketplace.controller.js";

const router = express.Router();

router.get("/items", getMarketplaceItems);

export default router;
