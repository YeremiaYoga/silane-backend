import jwt from "jsonwebtoken";
import crypto from "crypto";
import axios from "axios";
import supabase from "../utils/db.js";
import { createLoginHash } from "../utils/crypto.js";
import { getUserByLoginHash, getUserBySilaneId } from "../models/authModel.js";
import {
  getHeraldSilaneByUserId,
  createHeraldSilane
} from "../models/silaneAssetsModel.js";
import {
  getHeraldsFireflyByUserId,
  createHeraldsFirefly
} from "../models/fireflyModel.js";

const generatePublicId = () => crypto.randomBytes(8).toString("hex");

// Global map to hold pending authentications for polling
export const pendingAuths = new Map();

export const pollAuthStatus = (req, res) => {
  const { temp_id } = req.query;
  if (!temp_id) return res.status(400).json({ error: "Missing temp_id" });

  if (pendingAuths.has(temp_id)) {
    const authData = pendingAuths.get(temp_id);
    pendingAuths.delete(temp_id); // Clean up
    return res.json({ status: "success", ...authData });
  }

  return res.json({ status: "pending" });
};

export const loginFoundry = async (req, res, next) => {
  try {
    const { secretId } = req.body;

    if (!secretId) {
      return res.status(400).json({ success: false, message: "Secret ID is required!" });
    }

    // ==========================================
    // ADMIN LOGIN — cek apakah secretId = ADMIN_LOGIN_CODE di .env
    // ==========================================
    const adminCode = process.env.ADMIN_LOGIN_CODE;
    if (adminCode && secretId === adminCode) {
      const adminId = "00000000-0000-0000-0000-000000000000";
      const token = jwt.sign(
        { id: adminId, username: "Admin", role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      return res.json({
        success: true,
        message: "Admin login successful",
        token,
        user: {
          id: adminId,
          username: "Admin",
          role: "admin",
          profile_picture: null,
          limits: null,
        },
      });
    }

    let user = null;
    if (secretId && secretId.length === 16) {
      user = await getUserBySilaneId(secretId);
    }
    
    if (!user) {
      const hashedAttempt = createLoginHash(secretId);
      user = await getUserByLoginHash(hashedAttempt);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid Secret ID or Silane ID." });
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

    // Auto-create heralds_firefly row jika belum ada
    let { data: fireflyData, error: fireflyError } = await getHeraldsFireflyByUserId(user.id);
    if (fireflyError && fireflyError.code === "PGRST116") {
      const newFireflyData = {
        user_id: user.id,
        user_name: user.username,
        weapons: [],
        spells: [],
        consumables: [],
        containers: [],
        equipments: [],
        feats: [],
        loots: [],
        tools: [],
      };
      await createHeraldsFirefly(newFireflyData);
    } else if (fireflyError) {
      throw fireflyError;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
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
        silane_id: user.silane_id,
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

    let user = null;
    if (secretId && secretId.length === 16) {
      user = await getUserBySilaneId(secretId);
    }
    
    if (!user) {
      const hashedAttempt = createLoginHash(secretId);
      user = await getUserByLoginHash(hashedAttempt);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "❌ Failed! ID is incorrect or not found.",
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

// ==========================================
// CRYPTO & ID HELPERS FOR AUTH
// ==========================================
const IV_LENGTH = 16;
function encryptSecret(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.ENCRYPTION_KEY || "heralds_media_super_secret_key!!"),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptSecret(text) {
  if (!text) return null;
  try {
    const textParts = text.split(":");
    if (textParts.length !== 2) return text; 

    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(process.env.ENCRYPTION_KEY || "heralds_media_super_secret_key!!"),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error("⚠️ Failed to decrypt secret_id:", e.message);
    return null; 
  }
}

async function generateUniqueSilaneId() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let silaneId = "";
  let attempts = 0;
  while (!isUnique && attempts < 10) {
    let candidate = "";
    for (let i = 0; i < 16; i++) {
      candidate += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("silane_id", candidate)
      .maybeSingle();
    if (!existing) {
      silaneId = candidate;
      isUnique = true;
    }
    attempts++;
  }
  if (!silaneId) {
    throw new Error("Failed to generate unique Silane ID");
  }
  return silaneId;
}

// ==========================================
// GOOGLE OAUTH
// ==========================================
export const googleLoginInitiate = (req, res) => {
  const { temp_id } = req.query;
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const state = temp_id || "guest";

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.GOOGLE_REDIRECT_URI
  )}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

  res.redirect(url);
};

export const googleLoginCallback = async (req, res, next) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ error: "No code provided" });

  try {
    // 1. Tukar Code dengan Access Token
    const { data: tokenData } = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      }
    );

    const { access_token, refresh_token } = tokenData;

    // 2. Ambil Profil dari Google
    const { data: googleUser } = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const email = googleUser.email;
    const fullName = googleUser.name || "Google User";
    const avatarUrl = googleUser.picture || null;
    const googleId = googleUser.id;

    // 3. Cari atau Buat User di Tabel users Supabase
    let { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (findError) throw findError;

    if (!user) {
      // Buat user baru
      const baseUsername = fullName.replace(/\s+/g, "").toLowerCase();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const username = `${baseUsername}${randomSuffix}`;

      // Generate unique fvtt secret
      const rawSecret = crypto.randomBytes(16).toString("hex");
      const encryptedSecret = encryptSecret(rawSecret);
      const loginHash = createLoginHash(rawSecret);

      const silaneId = await generateUniqueSilaneId();

      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            email,
            name: fullName,
            username: username,
            profile_picture: avatarUrl,
            role: "user",
            tier: "free",
            fvtt_secret_id: encryptedSecret,
            fvtt_login_hash: loginHash,
            silane_id: silaneId,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    } else {
      // Jika user sudah ada tapi belum memiliki silane_id
      if (!user.silane_id) {
        const silaneId = await generateUniqueSilaneId();
        const { data: updated, error: updateError } = await supabase
          .from("users")
          .update({ silane_id: silaneId })
          .eq("id", user.id)
          .select()
          .single();
        if (updateError) throw updateError;
        user = updated;
      }
    }

    // 4. Hubungkan Google Account (user_google)
    const { data: existingLink } = await supabase
      .from("user_google")
      .select("id")
      .eq("google_id", googleId)
      .maybeSingle();

    const googlePayload = {
      user_id: user.id,
      google_id: googleId,
      email: googleUser.email,
      full_name: googleUser.name,
      avatar_url: googleUser.picture,
      access_token,
      ...(refresh_token && { refresh_token }),
      raw_data: googleUser,
      updated_at: new Date().toISOString(),
    };

    if (existingLink) {
      await supabase
        .from("user_google")
        .update(googlePayload)
        .eq("id", existingLink.id);
    } else {
      await supabase.from("user_google").insert([googlePayload]);
    }

    // 5. Pastikan Heralds Silane Asset Profile exists
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

    // 6. Pastikan Heralds Firefly exists
    let { data: fireflyData, error: fireflyError } = await getHeraldsFireflyByUserId(user.id);
    if (fireflyError && fireflyError.code === "PGRST116") {
      const newFireflyData = {
        user_id: user.id,
        user_name: user.username,
        weapons: [],
        spells: [],
        consumables: [],
        containers: [],
        equipments: [],
        feats: [],
        loots: [],
        tools: [],
      };
      await createHeraldsFirefly(newFireflyData);
    } else if (fireflyError) {
      throw fireflyError;
    }

    // 7. Buat JWT Token untuk Silane Backend
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      profile_picture: user.profile_picture,
      limits: user.limits,
      silane_id: user.silane_id,
    };

    if (state && state !== "guest") {
      pendingAuths.set(state, { token, user: safeUser });
    }

    // 8. Tampilkan halaman HTML sukses yang mengirim token lewat postMessage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            background-color: #09090b;
            color: #f4f4f5;
            font-family: sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #18181b;
            border: 1px solid #27272a;
            padding: 2.5rem;
            border-radius: 0.75rem;
            text-align: center;
            max-width: 450px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          }
          h1 { color: #10b981; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Success!</h1>
          <p>You have successfully logged in using Google. You can close this window now.</p>
        </div>
        <script>
          const token = ${JSON.stringify(token)};
          const user = ${JSON.stringify(safeUser)};
          
          if (window.opener) {
            window.opener.postMessage({ type: "silane-auth-success", token, user }, "*");
          }
          setTimeout(() => window.close(), 1500);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Google Login Callback Exception:", error);
    next(error);
  }
};

// ==========================================
// PATREON OAUTH
// ==========================================
export const patreonLoginInitiate = (req, res) => {
  const { temp_id } = req.query;
  const CLIENT_ID = process.env.PATREON_CLIENT_ID;
  const REDIRECT_URI = process.env.PATREON_REDIRECT_URI;
  const PATREON_SCOPE = ["identity", "identity[email]"].join(" ");

  const state = temp_id || "guest";

  const url = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(PATREON_SCOPE)}&state=${encodeURIComponent(state)}`;

  res.redirect(url);
};

export const patreonLoginCallback = async (req, res, next) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).json({ error: "No code provided" });

  try {
    // 1. Tukar Code dengan Access Token
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.PATREON_REDIRECT_URI);
    params.append("client_id", process.env.PATREON_CLIENT_ID);
    params.append("client_secret", process.env.PATREON_CLIENT_SECRET);

    const tokenRes = await axios.post(
      "https://www.patreon.com/api/oauth2/token",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token } = tokenRes.data;

    // 2. Ambil Profil dari Patreon
    const userRes = await axios.get(
      "https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=email,full_name,image_url",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const patreonUser = userRes.data?.data;
    const patreonId = patreonUser?.id;
    const email = patreonUser?.attributes?.email || null;
    const fullName = patreonUser?.attributes?.full_name || "Patreon User";
    const avatarUrl = patreonUser?.attributes?.image_url || null;

    if (!patreonId) {
      return res.status(500).json({ error: "Invalid Patreon response" });
    }

    // 3. Cari atau Buat User di Tabel users Supabase
    let { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .or(`patreon_id.eq.${patreonId},email.eq.${email}`)
      .maybeSingle();

    if (findError) throw findError;

    if (!user) {
      // Buat user baru
      const baseUsername = fullName.replace(/\s+/g, "").toLowerCase();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const username = `${baseUsername}${randomSuffix}`;

      const rawSecret = crypto.randomBytes(16).toString("hex");
      const encryptedSecret = encryptSecret(rawSecret);
      const loginHash = createLoginHash(rawSecret);

      const silaneId = await generateUniqueSilaneId();

      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            email,
            name: fullName,
            username: username,
            profile_picture: avatarUrl,
            role: "user",
            tier: "free",
            patreon_id: patreonId,
            fvtt_secret_id: encryptedSecret,
            fvtt_login_hash: loginHash,
            silane_id: silaneId,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    } else {
      // Jika user sudah ada, pastikan patreon_id ter-sync dan silane_id terisi
      const updateFields = { patreon_id: patreonId };
      if (!user.silane_id) {
        updateFields.silane_id = await generateUniqueSilaneId();
      }
      
      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update(updateFields)
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      user = updated;
    }

    // 4. Hubungkan Patreon Account (user_patreon)
    const { data: existingLink } = await supabase
      .from("user_patreon")
      .select("id")
      .eq("patreon_id", patreonId)
      .maybeSingle();

    const patreonPayload = {
      user_id: user.id,
      patreon_id: patreonId,
      email: email,
      full_name: fullName,
      avatar_url: avatarUrl,
      access_token,
      ...(refresh_token && { refresh_token }),
      raw_data: patreonUser,
      updated_at: new Date().toISOString(),
    };

    if (existingLink) {
      await supabase
        .from("user_patreon")
        .update(patreonPayload)
        .eq("id", existingLink.id);
    } else {
      await supabase.from("user_patreon").insert([patreonPayload]);
    }

    // 5. Pastikan Heralds Silane Asset Profile exists
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

    // 6. Pastikan Heralds Firefly exists
    let { data: fireflyData, error: fireflyError } = await getHeraldsFireflyByUserId(user.id);
    if (fireflyError && fireflyError.code === "PGRST116") {
      const newFireflyData = {
        user_id: user.id,
        user_name: user.username,
        weapons: [],
        spells: [],
        consumables: [],
        containers: [],
        equipments: [],
        feats: [],
        loots: [],
        tools: [],
      };
      await createHeraldsFirefly(newFireflyData);
    } else if (fireflyError) {
      throw fireflyError;
    }

    // 7. Buat JWT Token untuk Silane Backend
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      profile_picture: user.profile_picture,
      limits: user.limits,
      silane_id: user.silane_id,
    };

    if (state && state !== "guest") {
      pendingAuths.set(state, { token, user: safeUser });
    }

    // 8. Tampilkan halaman HTML sukses yang mengirim token lewat postMessage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            background-color: #09090b;
            color: #f4f4f5;
            font-family: sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #18181b;
            border: 1px solid #27272a;
            padding: 2.5rem;
            border-radius: 0.75rem;
            text-align: center;
            max-width: 450px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
          }
          h1 { color: #10b981; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Success!</h1>
          <p>You have successfully logged in using Patreon. You can close this window now.</p>
        </div>
        <script>
          const token = ${JSON.stringify(token)};
          const user = ${JSON.stringify(safeUser)};
          
          if (window.opener) {
            window.opener.postMessage({ type: "silane-auth-success", token, user }, "*");
          }
          setTimeout(() => window.close(), 1500);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("❌ Patreon Login Callback Exception:", error);
    next(error);
  }
};
