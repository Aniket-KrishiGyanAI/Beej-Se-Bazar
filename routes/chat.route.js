import express from "express";
import { chatBot, chatHistory } from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/chatBot", chatBot);
router.get("/chatHistory/:user_id", chatHistory);

export default router;
