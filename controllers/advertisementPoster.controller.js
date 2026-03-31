import { AdvertisementPoster } from "../models/advertisementPoster.model.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { uploadToS3 } from "../utils/s3Upload.js";

const createAdvertisementPoster = async (req, res) => {
    try {
        const userId = req.user._id;

        if (req.user.role !== "FPO" && req.user.role !== "Staff") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only admins can add posters",
            });
        }

        const uploadedPosters = [];

        if (req.files && req.files.posterImages?.length > 0) {
            for (const file of req.files.posterImages) {
                const uploaded = await uploadToS3(file, userId);

                if (!uploaded.url) {
                    uploaded.url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploaded.key}`;
                }

                uploadedPosters.push(uploaded);
            }
        }

        const newPoster = await AdvertisementPoster.create({ posters: uploadedPosters });

        res.status(201).json({ message: "Advertisement poster created successfully", data: newPoster });
    } catch (error) {
        res.status(500).json({ message: "Error creating advertisement poster", error: error.message });
    }
};

const getAllAdvertisementPosters = async (req, res) => {
    try {
        const posters = await AdvertisementPoster.find();
        res.status(200).json({ data: posters });
    } catch (error) {
        res.status(500).json({ message: "Error fetching advertisement posters", error: error.message });
    }
};

const deleteAdvertisementPoster = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "FPO" && req.user.role !== "Staff") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only admins can delete posters",
            });
        }

        const deletedPoster = await AdvertisementPoster.findByIdAndDelete(id);

        if (!deletedPoster) {
            return res.status(404).json({ message: "Advertisement poster not found" });
        }

        // delete related images from S3
        if (
            deletedPoster.posterImages &&
            Array.isArray(deletedPoster.posterImages)
        ) {
            for (const image of deletedPoster.posterImages) {
                if (image?.key) await deleteFromS3(image.key);
            }
        }

        res.status(200).json({ message: "Advertisement poster deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting advertisement poster", error: error.message });
    }
};

export {
    createAdvertisementPoster,
    getAllAdvertisementPosters,
    deleteAdvertisementPoster
}