import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { getGroupById, getGroupByShareCode } from "../controllers/groupController.js";

const router = express.Router();

router.use(verifyToken);

// Get group by ID
router.get("/:id", getGroupById);

// Get group by share code
router.get("/share/:code", getGroupByShareCode);

export default router;
