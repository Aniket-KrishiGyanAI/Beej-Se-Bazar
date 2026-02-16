import express from "express";
import cors from "cors";

import userRoutes from "./routes/user.route.js";
import cropListingRoutes from "./routes/cropListing.route.js";
import purchaseRoutes from "./routes/purchase.route.js";
import productRoutes from "./routes/product.route.js";
import farmRoutes from "./routes/farm.route.js";
import cropRoutes from "./routes/crop.route.js";
import inventoryRoutes from "./routes/inventory.route.js";
import sellRoutes from "./routes/sell.route.js";
import otpRoutes from "./routes/otp.route.js";
import marketplaceRoute from "./routes/marketplace.route.js";
import cartRoutes from "./routes/cart.route.js";
import orderRoute from "./routes/order.route.js";
import cropDoctorRoutes from "./routes/cropDoctor.route.js";
import adminRoute from "./routes/admin.route.js";
import chatRoutes from "./routes/chat.route.js";
import reportRoutes from "./routes/report.route.js";
import postRoutes from "./routes/post.route.js";
import fcmRoutes from "./routes/fcm.route.js"

import admin from "./config/firebase.js";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

app.get("/", (req, res) => {
  res.send("Welcome to Beej Se Bazar ✅");
});

app.use("/api/user", userRoutes);
app.use("/api/crop-listing", cropListingRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/product", productRoutes);
app.use("/api/farm", farmRoutes);
app.use("/api/crop", cropRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sell", sellRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/marketplace", marketplaceRoute);
app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoute);
app.use("/api/crop-doctor", cropDoctorRoutes);
app.use("/api/admin", adminRoute);
app.use("/api/chat", chatRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/fcm", fcmRoutes);

app.post("/fcm/test", async (req, res) => {
  try {
    const { token } = req.body;

    const response = await admin.messaging().send({
      token,
      notification: {
        title: "Direct Console Test",
        body: "Testing single device token",
      },
    });

    console.log("Direct Send Response:", response);

    res.json({ success: true, response });

  } catch (error) {
    console.error("Direct Send Error:", error);
    res.status(500).json({ error });
  }
});

export default app;
