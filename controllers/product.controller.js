import { InventoryItem, InventoryStock } from "../models/inventory.model.js";
import { Product } from "../models/product.model.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { uploadToS3 } from "../utils/s3Upload.js";

// add product
const addProduct = async (req, res) => {
  try {
    let {
      productName,
      description,
      brand,
      products,
      productImages,
    } = req.body;

    // parsing the product
    if (typeof products === "string") {
      products = JSON.parse(products);
    }

    if (!productName || !brand || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    const userId = req.user._id;

    // must have at least one image
    if (
      (!req.files || req.files.length === 0) &&
      (!Array.isArray(productImages) || productImages.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required",
      });
    }

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can add products",
      });
    }

    const uploadedImages = [];

    // MULTIPLE BASE64 IMAGES
    if (Array.isArray(productImages)) {
      for (const base64Image of productImages) {
        if (!base64Image.startsWith("data:")) continue;

        const base64Data = base64Image.split(",")[1];
        const mimeType = base64Image.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];

        const buffer = Buffer.from(base64Data, "base64");

        const mockFile = {
          buffer,
          originalname: `product_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}.${extension}`,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "productImages",
        };

        const uploaded = await uploadToS3(mockFile, req.user._id);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    // MULTIPLE FORM-DATA FILES
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadToS3(file, req.user._id);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    // duplicate variant check
    if (Array.isArray(products) && products.length > 0) {
      const seenVariants = new Set();

      for (const variant of products) {
        const { parameter, unit } = variant;

        const key = `${parameter}-${unit}`;

        if (seenVariants.has(key)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate variant detected: ${parameter}${unit}`,
          });
        }

        seenVariants.add(key);
      }
    }

    const product = await Product.create({
      productName,
      description,
      brand,
      products,
      productImages: uploadedImages,
    });

    // Inventory handling (ADD STOCK)
    for (const variant of product.products) {

      let inventoryItem = await InventoryItem.findOne({
        sourceRef: product._id,
        variantId: variant._id
      });

      if (!inventoryItem) {
        inventoryItem = await InventoryItem.create({
          sourceType: "PRODUCT",
          sourceRef: product._id,
          variantId: variant._id,
          itemName: `${product.productName.trim()} ${variant.parameter}${variant.unit}`,
          brand: product.brand.trim(),
          unit: variant.unit,
          parameter: variant.parameter,
          expiryDate: variant.expiryDate || null,
          purchasePrice: variant.mrp
        });
      }

      let inventoryStock = await InventoryStock.findOne({
        item: inventoryItem._id,
      });

      if (!inventoryStock) {
        await InventoryStock.create({
          item: inventoryItem._id,
          availableQuantity: variant.quantity,
          lastUpdatedBy: userId,
        });
      } else {
        inventoryStock.availableQuantity += variant.quantity;
        inventoryStock.lastUpdatedBy = userId;
        inventoryStock.lastUpdatedAt = new Date();

        await inventoryStock.save();
      }
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

    let { productName, description, brand, products, productImages } = req.body;

    if (typeof products === "string") {
      products = JSON.parse(products);
    }

    if (req.user.role !== "FPO" && req.user.role !== "Staff") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only admins can update products",
      });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Duplicate variant check
    if (Array.isArray(products)) {
      const seenVariants = new Set();

      for (const variant of products) {
        const key = `${variant.parameter}-${variant.unit}`;

        if (seenVariants.has(key)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate variant detected: ${variant.parameter}${variant.unit}`,
          });
        }

        seenVariants.add(key);
      }
    }

    // Preserve existing variant _id
    if (Array.isArray(products)) {
      for (const variant of products) {
        const existingVariant = existingProduct.products.find(
          (v) =>
            v.parameter === variant.parameter &&
            v.unit === variant.unit
        );

        if (existingVariant) {
          variant._id = existingVariant._id;
        }
      }
    }

    const updatedData = {};

    if (productName) updatedData.productName = productName;
    if (description) updatedData.description = description;
    if (brand) updatedData.brand = brand;

    if (Array.isArray(products)) {
      updatedData.products = products;
    }

    const uploadedImages = [];

    if (Array.isArray(productImages)) {
      for (const base64Image of productImages) {
        if (!base64Image?.startsWith("data:")) continue;

        const base64Data = base64Image.split(",")[1];
        const mimeType = base64Image.split(";")[0].split(":")[1];
        const extension = mimeType.split("/")[1];

        const buffer = Buffer.from(base64Data, "base64");

        const mockFile = {
          buffer,
          originalname: `product_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}.${extension}`,
          mimetype: mimeType,
          size: buffer.length,
          fieldname: "productImages",
        };

        const uploaded = await uploadToS3(mockFile, userId);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadToS3(file, userId);

        if (!uploaded.url) {
          uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
        }

        uploadedImages.push(uploaded);
      }
    }

    if (uploadedImages.length > 0) {
      for (const img of existingProduct.productImages || []) {
        if (img?.key) {
          await deleteFromS3(img.key);
        }
      }

      updatedData.productImages = uploadedImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (Array.isArray(products)) {
      for (const variant of products) {

        let inventoryItem = await InventoryItem.findOne({
          sourceRef: updatedProduct._id,
          variantId: variant._id
        });

        if (!inventoryItem) {
          inventoryItem = await InventoryItem.create({
            sourceType: "PRODUCT",
            sourceRef: updatedProduct._id,
            variantId: variant._id,
            itemName: `${updatedProduct.productName.trim()} ${variant.parameter}${variant.unit}`,
            brand: updatedProduct.brand.trim(),
            unit: variant.unit,
            parameter: variant.parameter,
            expiryDate: variant.expiryDate || null,
            purchasePrice: variant.mrp
          });
        } else {
          inventoryItem.purchasePrice = variant.mrp;
          inventoryItem.expiryDate = variant.expiryDate || null;
          await inventoryItem.save();
        }

        let inventoryStock = await InventoryStock.findOne({
          item: inventoryItem._id
        });

        if (!inventoryStock) {
          await InventoryStock.create({
            item: inventoryItem._id,
            availableQuantity: variant.quantity,
            lastUpdatedBy: userId
          });
        } else {
          inventoryStock.availableQuantity = variant.quantity;
          inventoryStock.lastUpdatedBy = userId;
          inventoryStock.lastUpdatedAt = new Date();
          await inventoryStock.save();
        }
      }

      // Remove inventory for deleted variants
      const variantIds = products.map(v => v._id.toString());

      const inventoryItems = await InventoryItem.find({
        sourceRef: updatedProduct._id
      });

      for (const item of inventoryItems) {
        if (!variantIds.includes(item.variantId.toString())) {
          await InventoryStock.deleteOne({ item: item._id });
          await InventoryItem.deleteOne({ _id: item._id });
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

const getExpiryDashboard = async (req, res) => {
  try {
    const today = new Date();

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const in60Days = new Date();
    in60Days.setDate(in60Days.getDate() + 60);

    const result = await Product.aggregate([
      { $match: { isActive: true } },

      { $unwind: "$products" },

      {
        $addFields: {
          daysLeft: {
            $divide: [
              { $subtract: ["$products.expiryDate", today] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },

      {
        $match: {
          "products.expiryDate": { $ne: null }
        }
      },

      {
        $project: {
          productId: "$_id",
          productName: 1,
          brand: 1,
          parameter: "$products.parameter",
          unit: "$products.unit",
          mrp: "$products.mrp",
          expiryDate: "$products.expiryDate",
          purchaseDate: "$products.purchaseDate",
          daysLeft: { $round: ["$daysLeft", 0] }
        }
      },

      {
        $facet: {
          expired: [
            { $match: { expiryDate: { $lt: today } } },
            { $sort: { expiryDate: 1 } }
          ],

          expiringIn30Days: [
            { $match: { expiryDate: { $gte: today, $lte: in30Days } } },
            { $sort: { expiryDate: 1 } }
          ],

          expiringIn60Days: [
            { $match: { expiryDate: { $gt: in30Days, $lte: in60Days } } },
            { $sort: { expiryDate: 1 } }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error("Expiry dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expiry dashboard"
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
  getExpiryDashboard
};
