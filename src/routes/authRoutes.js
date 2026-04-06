import express from "express";
import { loginFoundry, testLoginGet } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", loginFoundry);

router.get("/test/:secretId", testLoginGet);

export default router;