import express from "express";
import {
  importFireflyItems,
  listFireflyItems,
  getFireflyItem,
  deleteFireflyItems,
  exportFireflyItem,
  getFireflyTypes,
  // Homebrew
  importHomebrewItems,
  listHomebrewItems,
  getHomebrewItem,
  deleteHomebrewItems,
  getHomebrewCollection,
  getHomebrewTypes,
} from "../controllers/fireflyController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get allowed types
router.get("/types", getFireflyTypes);

// Import items from Foundry JSON (auto-filter & route to correct table)
router.post("/import", importFireflyItems);

// List items (query: ?type=weapon&search=sword&limit=50&offset=0)
router.get("/items", listFireflyItems);

// Get single item detail
router.get("/items/:type/:id", getFireflyItem);

// Export item as raw Foundry JSON
router.get("/items/:type/:id/export", exportFireflyItem);

// Delete items (body: { type: "weapon", ids: [...] })
router.post("/delete", deleteFireflyItems);

// ==========================================
// HOMEBREW ROUTES
// ==========================================

// Get homebrew types
router.get("/homebrew/types", getHomebrewTypes);

// Get user's homebrew collection (heralds_firefly summary)
router.get("/homebrew/collection", getHomebrewCollection);

// Import homebrew items (auto-filter, insert ke *_homebrew + catat di heralds_firefly)
router.post("/homebrew/import", importHomebrewItems);

// List homebrew items milik user
router.get("/homebrew/items", listHomebrewItems);

// Get single homebrew item
router.get("/homebrew/items/:type/:id", getHomebrewItem);

// Delete homebrew items (+ hapus dari heralds_firefly)
router.post("/homebrew/delete", deleteHomebrewItems);

export default router;
