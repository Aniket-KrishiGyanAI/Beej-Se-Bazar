import express from "express";
import {
  deleteUser,
  getAllFarmers,
  getAllUsers,
  getUserPrivateFiles,
  getUserDetails,
  registerUser,
  signInUser,
  updateProfile,
} from "../controllers/user.controller.js";
import { uploadDocuments } from "../controllers/document.controller.js";
import { protect } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";
const router = express.Router();

router.post("/register", registerUser);
router.post("/signin", signInUser);
router.put(
  "/update-profile",
  protect,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "soilHealthCard", maxCount: 1 },
    { name: "labReport", maxCount: 1 },
    { name: "govtSchemeDocs", maxCount: 3 },
  ]),
  updateProfile
);
router.post("/upload-documents", protect, upload.fields([
  { name: "soilHealthCard", maxCount: 1 },
  { name: "labReport", maxCount: 1 },
  { name: "governmentDocument", maxCount: 1 },
]), uploadDocuments);
router.delete("/delete-account",protect, deleteUser);
router.get("/getUserDetails",protect, getUserDetails);
router.get("/getAllUsers", protect, getAllUsers);
router.get("/files/private", protect, getUserPrivateFiles);
router.get("/getAllFarmers", protect, getAllFarmers);

export default router;