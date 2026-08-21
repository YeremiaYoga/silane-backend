import express from "express";
import { getIgniteCharacters, getIgniteCharacterByCodeController } from "../controllers/igniteCharacterController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/ignite-characters", verifyToken, getIgniteCharacters);
router.get("/ignite-characters/by-code/:code", verifyToken, getIgniteCharacterByCodeController);

export default router;
