import { sendToTopic } from "../utils/notificationService.js";

const broadcastMessage = async (req, res) => {
  if (req.user.role !== "FPO") {
    return res.status(403).json({ message: "Unauthorized" });
  }

  const { title, body } = req.body;

  await sendToTopic("all_users", {
    title,
    body,
    data: {
      type: "ADMIN_BROADCAST",
    },
  });

  res.json({ success: true });
};

export { broadcastMessage };