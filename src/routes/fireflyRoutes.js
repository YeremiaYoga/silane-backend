import express from "express";
import {
  importFireflyItems,
  uploadFireflyImage,
  listFireflyItems,
  getFireflyItem,
  deleteFireflyItems,
  exportFireflyItem,
  getFireflyTypes,
  importHomebrewItems,
  listHomebrewItems,
  getHomebrewItem,
  deleteHomebrewItems,
  getHomebrewCollection,
  getHomebrewTypes,
  getHomebrewUsage,
  adminListAllHomebrew,
} from "../controllers/fireflyController.js";
import upload from "../middlewares/uploadMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.use(verifyToken);

router.post("/upload_image", upload.single("file"), uploadFireflyImage);

router.get("/types", getFireflyTypes);

router.post("/import", importFireflyItems);

router.get("/items", listFireflyItems);

router.get("/items/:type/:id", getFireflyItem);

router.get("/items/:type/:id/export", exportFireflyItem);

router.post("/delete", deleteFireflyItems);

router.get("/homebrew/types", getHomebrewTypes);

router.get("/homebrew/usage", getHomebrewUsage);

router.get("/homebrew/collection", getHomebrewCollection);

router.post("/homebrew/import", importHomebrewItems);

router.get("/homebrew/items", listHomebrewItems);

router.get("/homebrew/items/:type/:id", getHomebrewItem);

router.post("/homebrew/delete", deleteHomebrewItems);

router.get("/admin/homebrew", adminListAllHomebrew);
export default router;
