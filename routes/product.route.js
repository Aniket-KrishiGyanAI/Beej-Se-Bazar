import express from "express";
import {
  addProduct,
  getProductById,
  getProducts,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getExpiryDashboard,
} from "../controllers/product.controller.js";
import { protect } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.post("/addProduct", protect, upload.array("productImages", 5), addProduct);
router.put(
  "/updateProduct/:id",
  protect,
  upload.array("productImages", 5),
  updateProduct,
);
router.get("/getProducts", getProducts);
router.get("/getProductById/:id", getProductById);
router.delete("/deleteProduct/:id", protect, deleteProduct);
router.put("/toggleProductStatus/:id", protect, toggleProductStatus);
router.get("/expiringProducts", protect, getExpiryDashboard);

export default router;
