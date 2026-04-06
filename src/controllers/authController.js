import jwt from "jsonwebtoken";
import { createLoginHash } from "../utils/crypto.js";
import { getUserByLoginHash } from "../models/authModel.js";

export const loginFoundry = async (req, res, next) => {
  try {
    const { secretId } = req.body;

    if (!secretId) {
      return res
        .status(400)
        .json({ success: false, message: "Secret ID diperlukan!" });
    }

    const hashedAttempt = createLoginHash(secretId);

    const user = await getUserByLoginHash(hashedAttempt);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Secret ID tidak valid." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );

    return res.json({
      success: true,
      message: "Berhasil login ke Foundry VTT",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile_picture: user.profile_picture,
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
      return res
        .status(400)
        .json({ success: false, message: "Secret ID tidak ada di URL!" });
    }

    const hashedAttempt = createLoginHash(secretId);

    const user = await getUserByLoginHash(hashedAttempt);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "❌ Gagal! Secret ID salah atau tidak ditemukan.",
      });
    }

    return res.json({
      success: true,
      message: "✅ Berhasil Login (Test Endpoint)",
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
