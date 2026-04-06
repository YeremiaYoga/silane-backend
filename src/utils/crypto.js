import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PEPPER_KEY = process.env.PEPPER_KEY || "heraldsmedia123";

// Fungsi untuk nge-hash input pemain sebelum dicocokkan ke database
export const createLoginHash = (secretId) => {
  if (!secretId) return null;
  return crypto
    .createHmac("sha256", PEPPER_KEY)
    .update(secretId)
    .digest("hex");
};