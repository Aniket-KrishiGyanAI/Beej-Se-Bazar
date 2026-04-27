import express from "express";

import {
    addProduct,
    deleteProductById,
    getAllProducts,
    getProductById,
    getProducts,
    updateProduct,
} from "../controllers/hardwareProduct.controller.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.post(
    "/addProduct",
    protect,
    upload.fields([
        { name: "hardwareProductImages", maxCount: 10 },
        { name: "hardwareProductVideos", maxCount: 5 },
    ]),
    addProduct
);
router.put(
    "/updateProduct/:id",
    protect,
    upload.fields([
        { name: "hardwareProductImages", maxCount: 10 },
        { name: "hardwareProductVideos", maxCount: 5 },
    ]),
    updateProduct
);
router.get("/getProducts", getProducts);
router.get("/getAllProducts", getAllProducts);
router.get("/getProductById/:id", getProductById);
router.put(
    "/reuploadMedia/:id",
    protect,
    upload.fields([
        { name: "hardwareProductImages", maxCount: 10 },
        { name: "hardwareProductVideos", maxCount: 5 },
    ]),
    reuploadMedia
);
router.post("/deleteProductById", deleteProductById);
