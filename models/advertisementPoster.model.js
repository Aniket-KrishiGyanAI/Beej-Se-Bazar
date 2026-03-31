import mongoose from "mongoose";
import { s3FileSchema } from "./S3_file_upload.model.js";

const advertisementPosterSchema = new mongoose.Schema({
    posters: [s3FileSchema],
});

export const AdvertisementPoster = mongoose.model("AdvertisementPoster", advertisementPosterSchema);