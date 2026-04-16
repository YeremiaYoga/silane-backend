import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createLoginHash } from "../utils/crypto.js";
import { getUserByLoginHash } from "../models/authModel.js";
import {
  getHeraldSilaneByUserId,
  createHeraldSilane
} from "../models/silaneAssetsModel.js";

const generatePublicId = () => crypto.randomBytes(8).toString("hex");

export const loginFoundry = async (req, res, next) => {
  try {
    const { secretId } = req.body;

    if (!secretId) {
      return res.status(400).json({ success: false, message: "Secret ID is required!" });
    }

    const hashedAttempt = createLoginHash(secretId);
    const user = await getUserByLoginHash(hashedAttempt);

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid Secret ID." });
    }

    let { data: silaneData, error: fetchError } = await getHeraldSilaneByUserId(user.id);
    if (fetchError && fetchError.code === "PGRST116") {
      const newData = {
        user_id: user.id,
        username: user.username,
        public_id: generatePublicId(),
        images: [],
        audio: [],
        visage: [],
        character: []
      };
      await createHeraldSilane(newData);
    } else if (fetchError) {
      throw fetchError;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" } // Sesuai instruksi 30 hari
    );

    return res.json({
      success: true,
      message: "Successfully logged into Foundry VTT",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile_picture: user.profile_picture,
        limits: user.limits, 
      },
    });
  } catch (error) {
    next(error);
  }
};

export const testLoginGet = async (req, res, next) => {
  try {
    const { secretId } = req.params;

    if (!secretId) {
      return res.status(400).json({ success: false, message: "Secret ID is missing from URL!" });
    }

    const hashedAttempt = createLoginHash(secretId);
    const user = await getUserByLoginHash(hashedAttempt);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "❌ Failed! Secret ID is incorrect or not found.",
      });
    }

    return res.json({
      success: true,
      message: "✅ Login Successful (Test Endpoint)",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        profile_picture: user.profile_picture,
      },
    });
  } catch (error) {
    next(error);
  }
};