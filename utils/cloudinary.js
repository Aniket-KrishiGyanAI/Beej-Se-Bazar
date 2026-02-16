import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

//! code for cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, folder) => {
  try {
    if (!localFilePath) return null;

    //* Upload file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folder || "others",
    });

    //* successful upload response
    // console.log("response from uploadOnCloudinary: ", response);

    //* Successful upload message
    // console.log("File uploaded successfully", response.url);

    //* Remove the local file after uploading
    await fs.promises.unlink(localFilePath);
    // console.log("Local file deleted successfully");

    return response;
  } catch (error) {
    console.error("Error uploading to Cloudinary: ", error.message);

    //* Remove the local file if the upload fails
    fs.unlink(localFilePath, (err) => {
      if (err) {
        console.error(
          "Error removing local file after Cloudinary upload failure: ",
          err
        );
      } else {
        console.log("Local file deleted after upload failure");
      }
    });
    return null;
  }
};

export { uploadOnCloudinary };
