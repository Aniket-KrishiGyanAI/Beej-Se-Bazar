import express from "express";
import {
  addFarm,
  deleteFarmById,
  getFarmById,
  getFarmsByUserId,
  updateFarmById,
} from "../controllers/farm.controller.js";

const router = express.Router();

router.post("/addFarm", addFarm);
router.get("/getFarmsByUserId/:userId", getFarmsByUserId);
router.get("/getFarmByFarmId/:id", getFarmById); // farm id
router.put("/updateFarmById/:id", updateFarmById); 
router.delete("/deleteFarmById/:id", deleteFarmById);

export default router;
