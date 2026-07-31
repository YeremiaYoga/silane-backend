import express from "express";
import {
  uploadBestiaryImage,
  importBestiaryItems,
  listBestiaryItems,
  getBestiaryItem,
  deleteBestiaryItems,
  adminListAllHomebrewBestiary,
  updateBestiaryItemImages,
} from "../controllers/bestiaryController.js";
import upload from "../middlewares/uploadMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/items", listBestiaryItems);

router.get("/items/:id", getBestiaryItem);

router.post("/upload_image", upload.single("file"), uploadBestiaryImage);

router.post("/update_images", updateBestiaryItemImages);

router.post("/import", importBestiaryItems);

router.post("/delete", deleteBestiaryItems);

router.get("/admin/homebrew", adminListAllHomebrewBestiary);

export default router;
