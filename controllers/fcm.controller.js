import { User } from "../models/user.model.js";

export const saveFcmToken = async (req, res) => {
  const { fcmToken } = req.body;
  const userId = req.user._id;

  if (!fcmToken) {
    return res.status(400).json({ message: "FCM token required" });
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: { fcmTokens: fcmToken }, // avoids duplicates
  });

  res.json({ success: true });
};
