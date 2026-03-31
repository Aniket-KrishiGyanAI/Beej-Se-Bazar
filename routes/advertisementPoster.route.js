import express from "express";
import { upload } from "../middlewares/multer.js";
import {
    createAdvertisementPoster,
    getAllAdvertisementPosters,
    deleteAdvertisementPoster,
} from "../controllers/advertisementPoster.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/upload-poster", upload.fields([{ name: "posterImages", maxCount: 5 }]), protect, createAdvertisementPoster);

router.get("/", getAllAdvertisementPosters);

router.delete("/:id/delete", protect, deleteAdvertisementPoster);

export default router;
