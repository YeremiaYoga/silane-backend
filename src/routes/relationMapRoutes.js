import express from "express";
import { optionalAuth } from "../middlewares/authMiddleware.js";
import {
  saveRelationMap,
  getUserRelationMaps,
  getRelationMapById,
  deleteRelationMap
} from "../controllers/relationMapController.js";

const router = express.Router();

router.use(optionalAuth);

router.get("/", getUserRelationMaps);
router.post("/", saveRelationMap);
router.get("/:id", getRelationMapById);
router.delete("/:id", deleteRelationMap);

export default router;
