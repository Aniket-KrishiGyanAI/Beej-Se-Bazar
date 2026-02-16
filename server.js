import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./db.js";

const PORT = process.env.PORT || 8080;

// Connect to MongoDB
connectDB();

mongoose.connection.once("open", () => {
  console.log(
    `✅ Connected to MongoDB database: ${mongoose.connection.db.databaseName}`
  );
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
