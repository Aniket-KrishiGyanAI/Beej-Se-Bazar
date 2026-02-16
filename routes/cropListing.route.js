import express from "express";
import {
  addCropListing,
  deleteCropListing,
  getCropByCropId,
  getCropListings,
  getCropListingsByUser,
  updateCropListing,
} from "../controllers/cropListing.controller.js";
import { upload } from "../middlewares/multer.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/add", protect, upload.array("cropImages", 5), addCropListing);
router.put(
  "/update/:id",
  protect,
  upload.array("cropImages", 5),
  updateCropListing
);
router.delete("/delete/:id", protect, deleteCropListing);
router.get("/getListings", getCropListings);
router.get("/getListingsByUser", protect, getCropListingsByUser);
router.get("/getCropByCropId/:id", getCropByCropId);

export default router;
