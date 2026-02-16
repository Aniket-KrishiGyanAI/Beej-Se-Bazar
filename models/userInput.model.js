import mongoose from "mongoose";

const userInputSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // farmer id
      ref: "User",
      required: true,
    },
    farmId: {
      type: mongoose.Schema.Types.ObjectId, // farm id - for which input is used
      ref: "Farm",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId, // product id - fertilizer/pesticide/seed etc.
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    inputType: {
      type: String,
      enum: ["fertilizer", "pesticide", "seed", "other"],
      required: true,
    },
  },
  { timestamps: true }
);

export const UserInput = mongoose.model("UserInput", userInputSchema);

// todo: why productId is required in user-input?
