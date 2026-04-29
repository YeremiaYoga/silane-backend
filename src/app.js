import express from "express";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import silaneAssetsRoutes from './routes/silaneAssetsRoutes.js';

const app = express();

app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

app.use("/api/auth", authRoutes);
app.use('/api/silane_assets', silaneAssetsRoutes);

app.get("/", (req, res) => {
  const formattedTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta", 
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  });

  res.json({
    status: "✅ Silane Backend (Foundry Gateway) running",
    last_update: formattedTime,
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Silane Global Error:", err.stack);
  res.status(500).json({ success: false, message: "Terjadi kesalahan pada server Silane." });
});

export default app;