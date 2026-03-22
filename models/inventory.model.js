import mongoose from "mongoose";

const InventoryItemSchema = new mongoose.Schema(
  {
    // Source tracking (for traceability only)
    sourceType: {
      type: String,
      default: "PRODUCT",
      immutable: true,
      required: true,
    },

    sourceRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Product",
    },

    // Item identity
    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      default: null,
    },

    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
    },

    parameter: {
      type: String,
      required: true
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate items
InventoryItemSchema.index(
  { sourceRef: 1, variantId: 1 },
  { unique: true }
);

export const InventoryItem = mongoose.model(
  "InventoryItem",
  InventoryItemSchema,
);

// Inventory stock schema
const InventoryStockSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      unique: true,
    },

    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    lastSellRate: {
      type: Number,
      default: null,
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

export const InventoryStock = mongoose.model(
  "InventoryStock",
  InventoryStockSchema,
);
