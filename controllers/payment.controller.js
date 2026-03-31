import { Payment } from "../models/payment.model";

// Farmer pays to FPO
const farmerPayment = async (req, res) => {
    try {
        const { farmerId, amount, paymentMethod } = req.body;

        if(req.user.role !== "FPO") {
            return res.status(403).json({ success: false, message: "Access Denied" });
        }

        const payment = await Payment.create({
            user: farmerId,
            amount,
            type: "FARMER_TO_FPO",
            paymentMethod,
            createdBy: req.user._id
        });

        await Ledger.create({
            user: farmerId,
            type: "CREDIT",
            amount,
            referenceType: "PAYMENT",
            referenceId: payment._id,
            createdBy: req.user._id
        });

        res.json({ success: true, payment });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// FPO pays to Farmer
const fpoPayment = async (req, res) => {
    try {
        const { farmerId, amount, paymentMethod } = req.body;
        
        if(req.user.role !== "FPO") {
            return res.status(403).json({ success: false, message: "Access Denied" });
        }

        const payment = await Payment.create({
            user: farmerId,
            amount,
            type: "FPO_TO_FARMER",
            paymentMethod,
            createdBy: req.user._id
        });

        await Ledger.create({
            user: farmerId,
            type: "DEBIT",
            amount,
            referenceType: "PAYMENT",
            referenceId: payment._id,
            createdBy: req.user._id
        });

        res.json({ success: true, payment });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getFarmerBalance = async (req, res) => {
    const { farmerId } = req.params;

    const result = await Ledger.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(farmerId) } },
        {
            $group: {
                _id: null,
                totalCredit: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0]
                    }
                },
                totalDebit: {
                    $sum: {
                        $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0]
                    }
                }
            }
        }
    ]);

    const balance = result[0].totalCredit - result[0].totalDebit;

    res.json({
        success: true,
        balance
    });
};

export { farmerPayment, fpoPayment, getFarmerBalance };