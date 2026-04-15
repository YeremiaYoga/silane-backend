import express from "express";
import {
  uploadMedia,
  getDataSilane,
  updateVisageData,
  uploadVisageImage,
  deleteMedia,
  getStorageUsage // <--- Import fungsi baru
} from "../controllers/silaneAssetsController.js";
import upload from "../middlewares/uploadMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/data", verifyToken, getDataSilane);
router.get("/usage", verifyToken, getStorageUsage); // <--- Endpoint baru untuk hitung size

router.post("/upload", verifyToken, upload.single("file"), uploadMedia);
router.post("/delete", verifyToken, deleteMedia); 
router.post("/visage/update", verifyToken, updateVisageData);
router.post("/upload_visage", verifyToken, upload.single("file"), uploadVisageImage);

export default router;