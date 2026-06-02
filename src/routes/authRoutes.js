import express from "express";
import {
  loginFoundry,
  testLoginGet,
  pollAuthStatus,
  googleLoginInitiate,
  googleLoginCallback,
  patreonLoginInitiate,
  patreonLoginCallback,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", loginFoundry);

router.get("/test/:secretId", testLoginGet);
router.get("/poll-status", pollAuthStatus);

router.get("/google", googleLoginInitiate);
router.get("/google/callback", googleLoginCallback);

router.get("/patreon", patreonLoginInitiate);
router.get("/patreon/callback", patreonLoginCallback);

export default router;