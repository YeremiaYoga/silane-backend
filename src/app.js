import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";

import silaneAssetsRoutes from './routes/silaneAssetsRoutes.js';

const app = express();

app.use(cookieParser());
app.use(express.json());

// app.use(
//   cors({
//     origin: [
//       "http://localhost:30000",
//       process.env.FOUNDRY_SERVER_ORIGIN_1, 
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     optionsSuccessStatus: 200,
//   })
// );

app.use(
  cors({
    origin: true, 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/api/auth", authRoutes);
app.use('/api/silane_assets', silaneAssetsRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "✅ Silane Backend (Foundry Gateway) running",
    time: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Silane Global Error:", err.stack);
  res.status(500).json({ success: false, message: "Terjadi kesalahan pada server Silane." });
});

export default app;