import { Otp } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { generateOtp, hashOtp, compareOtp } from "../utils/otp.js";
import { sendSms } from "../utils/sendSms.js";
import jwt from "jsonwebtoken";

// Test Accounts Configuration
const TEST_ACCOUNTS = {
  "9000000001": { otp: "123456", role: "Farmer" },
  "9000000002": { otp: "123456", role: "Staff" },
  "9000000003": { otp: "123456", role: "FPO" },
};

const isTestAccount = (mobile) => TEST_ACCOUNTS[mobile] ?? null;

// send the otp
const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    // Check if user exists
    const user = await User.findOne({ phone: mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Handle Test Accounts
    const testAccount = isTestAccount(mobile);
    if (testAccount) {
      const otpHash = hashOtp(testAccount.otp);
      await Otp.deleteMany({ mobile });
      await Otp.create({
        mobile,
        otpHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      return res.json({ success: true, message: "OTP sent" });
    }

    // Handle Real Users
    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await Otp.deleteMany({ mobile });
    await Otp.create({
      mobile,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    await sendSms({
      mobileNos: mobile,
      message: `Dear user Your One-Time Password (OTP) for KrishiGyan AI (Powered by Luminoid Technologies Private Limited) is ${otp}. This OTP is valid for 10 minutes. Please do not share it with anyone.`,
      templateId: process.env.SMS_TEMPLATE_ID,
    });

    return res.json({ success: true, message: "OTP sent" });

  } catch (error) {
    console.error("sendOtp error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// verify the otp
const verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
    }

    const record = await Otp.findOne({ mobile });

    if (!record) {
      return res.status(400).json({ success: false, message: "OTP expired or not found" });
    }

    // Max attempts check
    if (record.attempts >= 5) {
      await Otp.deleteOne({ mobile });
      return res.status(403).json({ success: false, message: "Too many failed attempts. Please request a new OTP" });
    }

    // Expiry check
    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ mobile });
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one" });
    }

    // OTP validation
    const isValid = compareOtp(otp, record.otpHash);
    if (!isValid) {
      record.attempts += 1;
      await record.save();
      const remainingAttempts = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining`,
      });
    }

    // OTP verified - cleanup
    await Otp.deleteOne({ mobile });

    // Fetch user
    const user = await User.findOne({ phone: mobile });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "OTP verified successfully",
      data: user,
      token,
    });

  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export { sendOtp, verifyOtp };
