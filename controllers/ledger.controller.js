import { Ledger } from "../models/ledger.model.js";

// get ledger by id
const getLedger = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== "FPO" && req.user.role !== "Staff") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only admins can get ledger",
            });
        }

        const ledger = await Ledger.find({
            user: id
        }).sort({ createdAt: -1 })

        res.status(200).json({ ledger })
    } catch (error) {
        console.error("Error fetching ledger:", error);
        res.status(500).json({ message: "Failed to fetch ledger", error: error.message });
    }
}

// get all ledgers
const getAllLedgers = async (req, res) => {
    try {
        if (req.user.role !== "FPO" && req.user.role !== "Staff") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only admins can get all ledgers",
            });
        }

        const ledgers = await Ledger.find().populate('user', 'firstName lastName phone').sort({ createdAt: -1 })

        res.status(200).json({ ledgers })
    } catch (error) {
        console.error("Error fetching all ledgers:", error);
        res.status(500).json({ message: "Failed to fetch ledgers", error: error.message });
    }
}

// get ledger by referenceType
const getLedgerByReferenceType = async (req, res) => {
    try {
        const ledgerType = req.params.type;

        if (req.user.role !== "FPO" && req.user.role !== "Staff") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only admins can get ledger by reference type",
            });
        }

        const ledgers = await Ledger.find({
            referenceType: ledgerType
        }).populate('user', 'firstName lastName phone').sort({ createdAt: -1 })

        res.status(200).json({ ledgers })

    } catch (error) {
        res.status(500).json({ message: "Failed to fetch ledger by reference type", error: error.message });
    }
}

export { getLedger, getAllLedgers, getLedgerByReferenceType };