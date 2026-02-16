import { InventoryItem, InventoryStock } from "../models/inventory.model.js";
import { Product } from "../models/product.model.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { uploadToS3 } from "../utils/s3Upload.js";

// add product
const addProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      brand,
      mrp,
      quantity,
      unit,
      purchaseDate,
      expiryDate,
    } = req.body;

    const userId = req.user._id;

    if (!productName || !brand || !mrp || !quantity || !unit || !purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can add products",
      });
    }

    let uploadedProductImage = null;

    if (req.body.productImage?.startsWith("data:")) {
      try {
        const base64Data = req.body.productImage.split(",")[1];
        const mimeType = req.body.productImage.split(";")[0].split(":")[1];
        const buffer = Buffer.from(base64Data, "base64");

        const mockFile = {
          buffer,
          originalname: `product_${Date.now()}`,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "productImage",
        };

        uploadedProductImage = await uploadToS3(mockFile, userId);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid base64 image data",
        });
      }
    } else if (req.file) {
      uploadedProductImage = await uploadToS3(req.file, userId);
    }

    const product = await Product.create({
      productName,
      description,
      brand,
      mrp,
      quantity,
      unit,
      purchaseDate,
      expiryDate,
      productImage: uploadedProductImage,
    });

    // Inventory handling (ADD STOCK)
    let inventoryItem = await InventoryItem.findOne({
      itemName: productName,
      brand,
      unit,
    });

    if (!inventoryItem) {
      inventoryItem = await InventoryItem.create({
        sourceType: "PRODUCT",
        sourceRef: product._id,
        itemName: productName,
        brand,
        unit,
        expiryDate: expiryDate || null,
        purchasePrice: mrp,
      });
    } else {
      inventoryItem.purchasePrice = mrp;
      await inventoryItem.save();
    }

    let inventoryStock = await InventoryStock.findOne({
      item: inventoryItem._id,
    });

    if (!inventoryStock) {
      inventoryStock = await InventoryStock.create({
        item: inventoryItem._id,
        availableQuantity: quantity,
        lastUpdatedBy: req.user._id,
      });
    } else {
      inventoryStock.availableQuantity += quantity;
      inventoryStock.lastUpdatedBy = req.user._id;
      inventoryStock.lastUpdatedAt = new Date();
      await inventoryStock.save();
    }

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

// update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user._id;

    const {
      productName,
      description,
      brand,
      mrp,
      quantity,
      unit,
      purchaseDate,
      expiryDate,
    } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updatedData = {};

    if (productName) updatedData.productName = productName;
    if (description) updatedData.description = description;
    if (brand) updatedData.brand = brand;
    if (mrp) updatedData.mrp = mrp;
    if (quantity) updatedData.quantity = quantity;
    if (unit) updatedData.unit = unit;
    if (purchaseDate) updatedData.purchaseDate = purchaseDate;
    if (expiryDate) updatedData.expiryDate = expiryDate;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can update products",
      });
    }

    if (req.body.productImage?.startsWith("data:")) {
      const base64Data = req.body.productImage.split(",")[1];
      const mimeType = req.body.productImage.split(";")[0].split(":")[1];

      const buffer = Buffer.from(base64Data, "base64");

      const mockFile = {
        buffer,
        originalname: `product_${Date.now()}`,
        mimetype: mimeType,
        size: buffer.length,
        fieldname: "productImage",
      };

      const uploaded = await uploadToS3(mockFile, userId);

      // Delete old image from S3
      if (product.productImage?.key) {
        await deleteFromS3(product.productImage.key);
      }

      updatedData.productImage = uploaded;
    } else if (req.file) {
      const uploaded = await uploadToS3(req.file, userId);

      // Delete old image from S3
      if (product.productImage?.key) {
        await deleteFromS3(product.productImage.key);
      }

      updatedData.productImage = uploaded;
    }

    //! Inventory adjustment logic - check existing purchase (product)
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // update the product
    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    //! Inventory adjustment logic - stock management
    if (quantity !== undefined) {
      const inventoryItem = await InventoryItem.findOne({
        itemName: existingProduct.productName,
        brand: existingProduct.brand,
        unit: existingProduct.unit,
        purchasePrice: existingProduct.mrp,
      });

      if (inventoryItem) {
        const inventoryStock = await InventoryStock.findOne({
          item: inventoryItem._id,
        });

        if (inventoryStock) {
          const quantityDiff = quantity - existingProduct.quantity;

          inventoryStock.availableQuantity += quantityDiff;
          inventoryStock.lastUpdatedBy = req.user._id;
          inventoryStock.lastUpdatedAt = new Date();

          if (inventoryStock.availableQuantity < 0) {
            throw new Error("Inventory quantity cannot be negative");
          }

          await inventoryStock.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

// get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get product by id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// soft delete / deactivate product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can delete products",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // SOFT DELETE
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// toggle product active/inactive
const toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const newStatus = !product.isActive;

    // Toggle product
    product.isActive = newStatus;
    await product.save();

    // Toggle inventory item
    await InventoryItem.updateMany(
      { sourceRef: product._id },
      { $set: { isActive: newStatus } },
    );

    res.status(200).json({
      success: true,
      message: `Product ${newStatus ? "activated" : "deactivated"} successfully`,
      isActive: newStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  addProduct,
  updateProduct,
  getProducts,
  getProductById,
  deleteProduct,
  toggleProductStatus,
};
