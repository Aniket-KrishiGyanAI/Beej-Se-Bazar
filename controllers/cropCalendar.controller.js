import { CropCalendar } from "../models/cropCalendar.model.js";
import { generateCropData } from "../utils/cropCalenderData.js";

// Returns crop calendar - from DB if exists, else generates via AI and saves.
const getCropCalendar = async (req, res) => {
    const cropName = req.params.cropName.toLowerCase().trim();

    if (!cropName) {
        return res.status(400).json({ success: false, message: "Crop name is required." });
    }

    try {
        // 1. Check DB first
        const existing = await CropCalendar.findOne({ crop_name_english: cropName });

        if (existing) {
            console.log(`✅ [DB HIT] Returning cached data for: ${cropName}`);
            return res.status(200).json({
                success: true,
                source: "database",
                data: existing,
            });
        }

        // 2. Not in DB → generate from AI
        console.log(`🤖 [AI CALL] Generating data for: ${cropName}`);
        const aiData = await generateCropData(cropName);

        // 3. Save to DB
        const saved = await CropCalendar.create(aiData);
        console.log(`💾 [DB SAVE] Saved crop data for: ${cropName}`);

        return res.status(201).json({
            success: true,
            source: "ai_generated",
            data: saved,
        });
    } catch (error) {
        console.error(`❌ Error fetching crop [${cropName}]:`, error.message);

        // Handle JSON parse errors from AI response
        if (error instanceof SyntaxError) {
            return res.status(502).json({
                success: false,
                message: "AI returned invalid JSON. Please try again.",
                error: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
            error: error.message,
        });
    }
}

// Returns list of all crops already stored in DB.
const getAllCrops = async (req, res) => {
    try {
        const crops = await CropCalendar.find(
            {},
            { crop_name: 1, crop_type: 1, total_duration_days: 1, generated_at: 1 }
        ).sort({ crop_name: 1 });

        return res.status(200).json({
            success: true,
            count: crops.length,
            data: crops,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// Deletes a crop from DB (useful to force regeneration from AI).
const deleteCropCalendar = async (req, res) => {
    const cropName = req.params.cropName.toLowerCase().trim();

    try {
        const deleted = await CropCalendar.findOneAndDelete({ crop_name: cropName });

        if (!deleted) {
            return res.status(404).json({ success: false, message: `Crop "${cropName}" not found in DB.` });
        }

        return res.status(200).json({
            success: true,
            message: `Crop "${cropName}" deleted. Next request will regenerate from AI.`,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

export { getCropCalendar, getAllCrops, deleteCropCalendar };