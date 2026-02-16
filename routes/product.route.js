import express from "express";
import {
  addProduct,
  getProductById,
  getProducts,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "../controllers/product.controller.js";
import { protect } from "../middlewares/auth.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.post("/addProduct", protect, upload.single("productImage"), addProduct);
router.put(
  "/updateProduct/:id",
  protect,
  upload.single("productImage"),
  updateProduct,
);
router.get("/getProducts", getProducts);
router.get("/getProductById/:id", getProductById);
router.delete("/deleteProduct/:id", protect, deleteProduct);
router.put("/toggleProductStatus/:id", protect, toggleProductStatus);

export default router;
