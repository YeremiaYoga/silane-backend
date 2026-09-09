import express from "express";
import { getIgniteCharacters, getIgniteCharacterByCodeController } from "../controllers/igniteCharacterController.js";
import { verifyToken, optionalAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/ignite-characters", verifyToken, getIgniteCharacters);
router.get("/ignite-characters/by-code/:code", optionalAuth, getIgniteCharacterByCodeController);
router.get("/characters/private/:code", optionalAuth, getIgniteCharacterByCodeController);
router.get("/characters/public/:code", optionalAuth, getIgniteCharacterByCodeController);
router.get("/characters/aria/:code", optionalAuth, getIgniteCharacterByCodeController);

export default router;

