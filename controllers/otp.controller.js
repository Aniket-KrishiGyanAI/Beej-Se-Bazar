import { Otp } from "../models/otp.model.js";
import { User } from "../models/user.model.js";
import { generateOtp, hashOtp, compareOtp } from "../utils/otp.js";
import { sendSms } from "../utils/sendSms.js";

// send the otp
const sendOtp = async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({ message: "Mobile required" });
  }

  // first find the user in db
  const user = await User.findOne({ phone: mobile });

  if (!user) {
    return res.status(500).json({ message: "User not found" });
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);

  // Delete previous OTPs
  await Otp.deleteMany({ mobile });

  await Otp.create({
    mobile,
    otpHash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
  });

  await sendSms({
    mobileNos: mobile,
    message: `Dear user Your One-Time Password (OTP) for KrishiGyan AI (Powered by Luminoid Technologies Private Limited) is ${otp}. This OTP is valid for 5 minutes. Please do not share it with anyone.`,
    templateId: process.env.SMS_TEMPLATE_ID,
  });

  res.json({ success: true, message: "OTP sent" });
};

// verify the otp
const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({ message: "Mobile and OTP required" });
  }

  const record = await Otp.findOne({ mobile });

  if (!record) {
    return res.status(400).json({ message: "OTP expired or invalid" });
  }

  // Max attempts
  if (record.attempts >= 5) {
    await Otp.deleteOne({ mobile });
    return res.status(403).json({ message: "Too many attempts" });
  }

  if (record.expiresAt < new Date()) {
    await Otp.deleteOne({ mobile });
    return res.status(400).json({ message: "OTP expired" });
  }

  const isValid = compareOtp(otp, record.otpHash);

  if (!isValid) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // ✅ OTP verified successfully
  await Otp.deleteOne({ mobile });

  // find & get the user from db
  const user = await User.findOne({ phone: mobile });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  res.json({
    success: true,
    data: user,
    token,
    message: "OTP verified successfully",
  });
};

export { sendOtp, verifyOtp };
