import { HardwareProduct } from "../models/hardwareProduct.model.js";
import { uploadToS3 } from "../utils/s3Upload.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import slugify from "slugify";

// get products
const getProducts = async (req, res) => {
    try {
        const products = await HardwareProduct.find({});
        res.status(200).json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// add product
const addProduct = async (req, res) => {
    try {
        const { name, status, description, key_features, technical_details, price, product_type } = req.body;

        // Validate required fields
        if (!name || !price || !product_type) {
            return res.status(400).json({
                status: "error",
                message: "Name, price, and product type are required",
            });
        }

        const slug = slugify(name, { lower: true, strict: true });

        // Check duplicate
        const existing = await HardwareProduct.findOne({ slug });
        if (existing) {
            return res
                .status(400)
                .json({ status: "error", message: "Product already exists" });
        }

        let keyFeaturesArray = [];
        if (key_features) {
            try {
                keyFeaturesArray = typeof key_features === "string" ? JSON.parse(key_features) : key_features;
            } catch (e) {
                keyFeaturesArray = [key_features]; // Fallback if it's just a string instead of JSON
            }
        }

        let techDetailsArray = [];
        if (technical_details) {
            try {
                techDetailsArray = typeof technical_details === "string" ? JSON.parse(technical_details) : technical_details;
            } catch (e) {
                techDetailsArray = [technical_details];
            }
        }

        //  Upload images to S3
        let productImages = [];

        // if (!req.files?.['hardwareProductImages']?.length) {
        //   return res.status(400).json({
        //     error: 'File is empty or not received - check multer config'
        //   });
        // }

        if (req.files && req.files["hardwareProductImages"]) {
            for (const file of req.files["hardwareProductImages"]) {
                const uploaded = await uploadToS3(file, req.user.id);
                productImages.push(uploaded);
            }
        }

        // Upload videos to S3
        let productVideos = [];

        // if (!req.files?.['hardwareProductVideos']?.length) {
        //   return res.status(400).json({
        //     error: 'File is empty or not received - check multer config'
        //   });
        // }

        if (req.files && req.files["hardwareProductVideos"]) {
            for (const file of req.files["hardwareProductVideos"]) {
                const uploaded = await uploadToS3(file, req.user.id);
                productVideos.push(uploaded);
            }
        }

        const product = new HardwareProduct({
            name,
            slug,
            status: status || "active",
            description: description || "",
            key_features: keyFeaturesArray,
            technical_details: techDetailsArray,
            price: price || "",
            product_type,
            images: productImages,
            videos: productVideos,
        });

        await product.save();

        res.status(200).json({
            status: "success",
            message: "Product added successfully",
            data: product,
        });
    } catch (error) {
        console.error("Add Product Error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Server error while adding product",
        });
    }
};

// update product
const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        const existingProduct = await HardwareProduct.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({
                status: "error",
                message: "Product not found",
            });
        }

        const {
            name,
            status,
            description,
            key_features,
            technical_details,
            price,
            product_type,
            replaceImages,
            replaceVideos,
        } = req.body;

        if (name) {
            existingProduct.name = name;
            existingProduct.slug = slugify(name, { lower: true, strict: true });
        }
        if (status) existingProduct.status = status;
        if (description !== undefined) existingProduct.description = description;
        if (price !== undefined) existingProduct.price = Number(price);
        if (product_type) existingProduct.product_type = product_type;

        if (key_features) {
            try {
                existingProduct.key_features = typeof key_features === "string" ? JSON.parse(key_features) : key_features;
            } catch (e) {
                existingProduct.key_features = [key_features];
            }
        }

        if (technical_details) {
            try {
                existingProduct.technical_details = typeof technical_details === "string" ? JSON.parse(technical_details) : technical_details;
            } catch (e) {
                existingProduct.technical_details = [technical_details];
            }
        }

        // 🚀 Handle images
        let finalImages = existingProduct.images || [];
        if (replaceImages === "true") {
            for (const img of finalImages) {
                await deleteFromS3(img);
            }
            finalImages = [];
        }


        // if (!req.files?.['hardwareProductImages']?.length) {
        //   return res.status(400).json({
        //     error: 'File is empty or not received - check multer config'
        //   });
        // }

        if (req.files && req.files["hardwareProductImages"]) {
            const newImages = [];
            for (const file of req.files["hardwareProductImages"]) {
                const uploaded = await uploadToS3(file, req.user.id);
                newImages.push(uploaded);
            }
            finalImages = [...finalImages, ...newImages];
        }
        existingProduct.images = finalImages;

        // 🚀 Handle videos
        let finalVideos = existingProduct.videos || [];
        if (replaceVideos === "true") {
            for (const vid of finalVideos) {
                await deleteFromS3(vid);
            }
            finalVideos = [];
        }

        // if (!req.files?.['hardwareProductVideos']?.length) {
        //   return res.status(400).json({
        //     error: 'File is empty or not received - check multer config'
        //   });
        // }

        if (req.files && req.files["hardwareProductVideos"]) {
            const newVideos = [];
            for (const file of req.files["hardwareProductVideos"]) {
                const uploaded = await uploadToS3(file, req.user.id);
                newVideos.push(uploaded);
            }
            finalVideos = [...finalVideos, ...newVideos];
        }
        existingProduct.videos = finalVideos;

        await existingProduct.save();

        res.status(200).json({
            status: "success",
            message: "Product updated successfully",
            data: existingProduct,
        });
    } catch (error) {
        console.error("Update Product Error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Server error while updating product",
        });
    }
};

// get all products
const getAllProducts = async (req, res) => {
    try {
        let products = await HardwareProduct.find()
            .sort({ createdAt: -1 })
            .lean();

        products = products.map((p) => ({
            ...p,
            id: p._id.toString(),
        }));

        res.status(200).json({
            status: "success",
            count: products.length,
            data: products,
        });
    } catch (error) {
        console.error("Get All Products Error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Server error while fetching products",
        });
    }
};

// get product by id
const getProductById = async (req, res) => {
    try {
        const { id } = req.params; // product ID

        if (!id) {
            return res.status(400).json({
                status: "error",
                message: "Product ID is required",
            });
        }

        const product = await HardwareProduct.findOne({ _id: id }).lean();

        if (!product) {
            return res.status(404).json({
                status: "error",
                message: "Product not found",
            });
        }

        res.status(200).json({
            status: "success",
            data: product,
        });
    } catch (error) {
        console.error("Get Product by ID Error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Server error while fetching product",
        });
    }
};

// delete product by id
const deleteProductById = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                status: "error",
                message: "Product ID is required",
            });
        }

        const product = await HardwareProduct.findById(id);
        if (!product) {
            return res.status(404).json({
                status: "error",
                message: "Product not found",
            });
        }

        // delete images from s3
        if (product.images && product.images.length > 0) {
            for (const img of product.images) {
                await deleteFromS3(img);
            }
        }

        // delete videos from s3
        if (product.videos && product.videos.length > 0) {
            for (const vid of product.videos) {
                await deleteFromS3(vid);
            }
        }

        await HardwareProduct.deleteOne({ _id: id });

        res.status(200).json({
            status: "success",
            message: "Product deleted successfully",
        });
    } catch (error) {
        console.error("Delete Product Error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Server error while deleting product",
        });
    }
};

// reupload media (replace all images/videos)
const reuploadMedia = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await HardwareProduct.findById(id);
        if (!product) {
            return res.status(404).json({
                status: "error",
                message: "Product not found",
            });
        }

        // 1. Delete old images from S3
        if (product.images && product.images.length > 0) {
            for (const img of product.images) {
                await deleteFromS3(img);
            }
        }

        // 2. Delete old videos from S3
        if (product.videos && product.videos.length > 0) {
            for (const vid of product.videos) {
                await deleteFromS3(vid);
            }
        }

        // 3. Upload new images
        let productImages = [];
        if (req.files && req.files["hardwareProductImages"]) {
            for (const file of req.files["hardwareProductImages"]) {
                const uploaded = await uploadToS3(file, req.user.id);
                productImages.push(uploaded);
            }
        }

        // 4. Upload new videos
        let productVideos = [];
        if (req.files && req.files["hardwareProductVideos"]) {
            for (const file of req.files["hardwareProductVideos"]) {
                const uploaded = await uploadToS3(file, req.user.id);
                productVideos.push(uploaded);
            }
        }

        // 5. Update product
        product.images = productImages;
        product.videos = productVideos;
        await product.save();

        res.status(200).json({
            status: "success",
            message: "Product media re-uploaded successfully with new path",
            data: product,
        });
    } catch (error) {
        console.error("Reupload Media Error:", error.message);
        res.status(500).json({
            status: "error",
            message: "Server error while re-uploading media",
        });
    }
};

export {
    getProducts,
    addProduct,
    updateProduct,
    getAllProducts,
    getProductById,
    deleteProductById,
    reuploadMedia,
};