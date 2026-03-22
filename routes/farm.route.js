import express from "express";
import {
  addFarm,
  deleteFarmById,
  getAllFarms,
  getFarmById,
  getFarmsByUserId,
  updateFarmById,
} from "../controllers/farm.controller.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/addFarm", addFarm);
router.get("/getFarmsByUserId/:userId", getFarmsByUserId);
router.get("/getFarmByFarmId/:id", getFarmById); // farm id
router.put("/updateFarmById/:id", updateFarmById); 
router.delete("/deleteFarmById/:id", deleteFarmById);
router.get("/getAllFarms", protect, getAllFarms);

export default router;
