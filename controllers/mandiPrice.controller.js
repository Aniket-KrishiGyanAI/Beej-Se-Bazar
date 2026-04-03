import {
    fetchMandiPrices,
    detectLocation,
    getMyLocationPrices,
    fetchAllPages
} from "../utils/getMandiPrice.js";

// Get mandi prices by filters
const getMandiPrices = async (req, res) => {
    try {
        const { state, district, commodity, market, variety, grade } = req.query;

        const result = await fetchMandiPrices({
            state,
            district,
            commodity,
            market,
            variety,
            grade,
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get prices by user's location
const getMyMandiPrices = async (req, res) => {
    try {
        const { commodity } = req.query;

        if (!commodity) {
            return res.status(400).json({
                success: false,
                message: "Commodity is required"
            });
        }

        const result = await getMyLocationPrices(commodity);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get all pages of mandi prices
const getAllMandiPrices = async (req, res) => {
    try {
        const { state, district, commodity, maxPages = 5 } = req.query;

        const result = await fetchAllPages({
            state,
            district,
            commodity,
        }, parseInt(maxPages));

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

export {
    getMandiPrices,
    getMyMandiPrices,
    getAllMandiPrices,
}