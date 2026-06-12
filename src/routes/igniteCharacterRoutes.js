import express from "express";
import { getIgniteCharacters } from "../controllers/igniteCharacterController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/ignite-characters", verifyToken, getIgniteCharacters);

export default router;
