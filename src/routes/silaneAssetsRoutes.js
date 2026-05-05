import express from "express";
import {
  uploadMedia,
  getDataSilane,
  updateVisageData,
  uploadVisageImage,
  deleteMedia,
  getStorageUsage,
  updateCharacterData,
  // NEW AUDIO HANDLERS:
  uploadAudioTrack,
  updateAudioAlbum,
  updateAudioPlaylist,
  joinAudioAlbum
} from "../controllers/silaneAssetsController.js";
import upload from "../middlewares/uploadMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/data", verifyToken, getDataSilane);
router.get("/usage", verifyToken, getStorageUsage);

// MEDIA (IMAGES)
router.post("/upload", verifyToken, upload.single("file"), uploadMedia);
router.post("/delete", verifyToken, deleteMedia);

// VISAGE
router.post("/visage/update", verifyToken, updateVisageData);
router.post(
  "/upload_visage",
  verifyToken,
  upload.single("file"),
  uploadVisageImage,
);

// CHARACTER
router.post("/character/update", verifyToken, updateCharacterData);

// AUDIO
router.post("/audio/upload", verifyToken, upload.single("file"), uploadAudioTrack);
router.post("/audio/album/update", verifyToken, updateAudioAlbum);
router.post("/audio/playlist/update", verifyToken, updateAudioPlaylist);
router.post("/audio/join", verifyToken, joinAudioAlbum);

export default router;