import express from "express";
import {
  uploadMedia,
  getDataSilane,
  updateVisageData,
  uploadVisageImage,
  deleteMedia,
  getStorageUsage,
  updateCharacterData,
  uploadAudioTrack,
  updateAudioAlbum,
  updateAudioPlaylist,
  joinAudioAlbum,
  updateMediaData,
  createCharacterBackup,
  getCharacterBackups,
  getSingleBackupData,
  deleteCharacterBackup,
} from "../controllers/silaneAssetsController.js";
import upload from "../middlewares/uploadMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
const router = express.Router();
router.get("/data", verifyToken, getDataSilane);
router.get("/usage", verifyToken, getStorageUsage);

router.post("/upload", verifyToken, upload.single("file"), uploadMedia);
router.post("/delete", verifyToken, deleteMedia);
router.post("/image/update", verifyToken, upload.single("file"), updateMediaData);

router.post("/visage/update", verifyToken, updateVisageData);
router.post(
  "/upload_visage",
  verifyToken,
  upload.single("file"),
  uploadVisageImage,
);

router.post("/character/update", verifyToken, updateCharacterData);

router.post("/character/backup/create", verifyToken, createCharacterBackup);
router.get("/character/backup/list", verifyToken, getCharacterBackups);
router.get("/character/backup/:backupId", verifyToken, getSingleBackupData);
router.post("/character/backup/delete", verifyToken, deleteCharacterBackup);

router.post("/audio/upload", verifyToken, upload.single("file"), uploadAudioTrack);
router.post("/audio/album/update", verifyToken, updateAudioAlbum);
router.post("/audio/playlist/update", verifyToken, updateAudioPlaylist);
router.post("/audio/join", verifyToken, joinAudioAlbum);
export default router;