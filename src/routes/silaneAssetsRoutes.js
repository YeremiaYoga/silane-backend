import express from "express";
import {
  uploadMedia,
  getDataSilane,
  updateVisageData,
  uploadVisageImage,
  deleteMedia,
  getStorageUsage,
  updateCharacterData,
} from "../controllers/silaneAssetsController.js";
import upload from "../middlewares/uploadMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/data", verifyToken, getDataSilane);
router.get("/usage", verifyToken, getStorageUsage);

router.post("/upload", verifyToken, upload.single("file"), uploadMedia);
router.post("/delete", verifyToken, deleteMedia);

router.post("/visage/update", verifyToken, updateVisageData);
router.post(
  "/upload_visage",
  verifyToken,
  upload.single("file"),
  uploadVisageImage,
);

router.post("/character/update", verifyToken, updateCharacterData);

export default router;