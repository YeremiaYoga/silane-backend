import {
  listFoundryBestiary,
  getFoundryBestiaryById,
  upsertFoundryBestiary,
  deleteFoundryBestiary,
  listHomebrewBestiary,
  getHomebrewBestiaryById,
  upsertHomebrewBestiary,
  deleteHomebrewBestiary,
} from "../models/bestiaryModel.js";
import { uploadAssetToR2, deleteAssetFromR2 } from "../utils/r2.js";

export async function uploadBestiaryImage(req, res) {
  try {
    const file = req.file;
    const { fvtt_id = "actor", image_type = "token" } = req.body;
    const user = req.user;

    if (!file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
    }

    const isAdmin = user.role === "admin";
    const userIdentifier = user.silane_id || user.id || user.username || "User";

    const suffix = image_type === "portrait" || image_type === "port" ? "port" : "token";
    const customFileName = `${fvtt_id}-${suffix}.webp`;

    let folderName = "";
    if (isAdmin) {
      folderName = "bestiary";
    } else {
      folderName = `Silane/${userIdentifier}`;
    }

    const publicUrl = await uploadAssetToR2({
      file,
      folderName,
      customFileName,
    });

    if (!publicUrl) {
      return res.status(500).json({ success: false, message: "Failed to upload image to Cloudflare R2." });
    }

    return res.json({
      success: true,
      url: publicUrl,
      is_global: isAdmin,
      folder: folderName,
      filename: customFileName,
    });
  } catch (error) {
    console.error("uploadBestiaryImage error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export function ensureHttps(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return urlStr;
  let str = urlStr.trim();
  if (str.startsWith("data:") || str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }
  if (str.includes(".") && !str.startsWith("/")) {
    return `https://${str}`;
  }
  return str;
}

export function sanitizeItemImages(item) {
  if (!item) return item;
  if (item.image) item.image = ensureHttps(item.image);
  if (item.img_portrait) item.img_portrait = ensureHttps(item.img_portrait);
  if (item.img_token) item.img_token = ensureHttps(item.img_token);
  if (item.raw_data) {
    if (item.raw_data.img) item.raw_data.img = ensureHttps(item.raw_data.img);
    if (item.raw_data.prototypeToken?.texture?.src) {
      item.raw_data.prototypeToken.texture.src = ensureHttps(item.raw_data.prototypeToken.texture.src);
    }
  }
  if (item.format_data) {
    if (item.format_data.img) item.format_data.img = ensureHttps(item.format_data.img);
    if (item.format_data.prototypeToken?.texture?.src) {
      item.format_data.prototypeToken.texture.src = ensureHttps(item.format_data.prototypeToken.texture.src);
    }
  }
  return item;
}

export async function uploadExternalUrlToR2(urlStr, fvttId, imageType, user) {
  if (!urlStr || typeof urlStr !== "string") return urlStr;

  let formattedUrl = ensureHttps(urlStr);

  const r2Domain = (process.env.SILANE_PUBLIC_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const r2PublicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (
    (r2Domain && formattedUrl.includes(r2Domain)) ||
    (r2PublicUrl && formattedUrl.includes(r2PublicUrl)) ||
    formattedUrl.includes("r2.cloudflarestorage.com") ||
    formattedUrl.includes("channeldeliver.my.id") ||
    formattedUrl.includes("pub-") ||
    formattedUrl.includes("projectignite")
  ) {
    return formattedUrl;
  }

  try {
    const fetchRes = await fetch(formattedUrl);
    if (!fetchRes.ok) return formattedUrl;

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = fetchRes.headers.get("content-type") || "image/webp";

    const isAdmin = user.role === "admin";
    const userIdentifier = user.silane_id || user.id || user.username || "User";
    const suffix = imageType === "portrait" || imageType === "port" ? "port" : "token";
    const customFileName = `${fvttId}-${suffix}.webp`;

    const folderName = isAdmin ? "bestiary" : `Silane/${userIdentifier}`;

    const publicUrl = await uploadAssetToR2({
      file: { buffer, mimetype: contentType, originalname: customFileName },
      folderName,
      customFileName,
    });

    return ensureHttps(publicUrl || formattedUrl);
  } catch (err) {
    console.warn(`uploadExternalUrlToR2 failed for ${formattedUrl}:`, err.message);
    return formattedUrl;
  }
}

export async function importBestiaryItems(req, res) {
  try {
    const user = req.user;
    const isAdmin = user.role === "admin";
    const items = Array.isArray(req.body) ? req.body : [req.body];

    if (!items.length) {
      return res.status(400).json({ success: false, message: "No bestiary data provided." });
    }

    const results = [];
    for (const item of items) {
      const fvttId = item.fvtt_id || item.id || "actor";

      if (item.img_portrait && !item.img_portrait.startsWith("data:")) {
        item.img_portrait = await uploadExternalUrlToR2(item.img_portrait, fvttId, "portrait", user);
        item.image = item.img_portrait;
      }

      if (item.img_token && !item.img_token.startsWith("data:")) {
        item.img_token = await uploadExternalUrlToR2(item.img_token, fvttId, "token", user);
      }

      const rawData = item.raw_data && Object.keys(item.raw_data).length > 0
        ? JSON.parse(JSON.stringify(item.raw_data))
        : {};

      rawData.img = ensureHttps(item.img_portrait || item.image || "icons/svg/mystery-man.svg");
      if (!rawData.prototypeToken) rawData.prototypeToken = {};
      if (!rawData.prototypeToken.texture) rawData.prototypeToken.texture = {};
      rawData.prototypeToken.texture.src = ensureHttps(item.img_token || item.img_portrait || "icons/svg/mystery-man.svg");

      if (!rawData.prototypeToken.ring) {
        rawData.prototypeToken.ring = { enabled: false };
      } else if (typeof rawData.prototypeToken.ring === "object") {
        rawData.prototypeToken.ring.enabled = false;
      } else {
        rawData.prototypeToken.ring = false;
      }

      item.raw_data = rawData;
      item.format_data = JSON.parse(JSON.stringify(rawData));

      const itemData = sanitizeItemImages({
        ...item,
        user_id: user.id || user.user_id,
        user_name: user.username || user.user_name || "User",
      });

      if (isAdmin) {
        const saved = await upsertFoundryBestiary(itemData);
        results.push({ ...sanitizeItemImages(saved), is_global: true });
      } else {
        const saved = await upsertHomebrewBestiary(itemData);
        results.push({ ...sanitizeItemImages(saved), is_global: false });
      }
    }

    return res.json({
      success: true,
      imported: results.length,
      target: isAdmin ? "foundry_bestiary" : "bestiary_homebrew",
      items: results,
    });
  } catch (error) {
    console.error("importBestiaryItems error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function listBestiaryItems(req, res) {
  try {
    const user = req.user;
    const isAdmin = user.role === "admin";
    const { view = "foundry", search = "", limit = 200, offset = 0, type = "" } = req.query;

    let result;
    if (view === "homebrew") {
      result = await listHomebrewBestiary({
        userId: isAdmin ? req.query.user_id || null : (user.id || user.user_id),
        search,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } else {
      result = await listFoundryBestiary({
        search,
        type,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    const sanitizedItems = (result.items || []).map((i) => sanitizeItemImages(i));

    return res.json({
      success: true,
      items: sanitizedItems,
      total: result.total,
      view: view,
    });
  } catch (error) {
    console.error("listBestiaryItems error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getBestiaryItem(req, res) {
  try {
    const { id } = req.params;
    const { view = "foundry" } = req.query;
    const user = req.user;

    let item;
    if (view === "homebrew") {
      item = await getHomebrewBestiaryById(id, user.id || user.user_id);
    } else {
      item = await getFoundryBestiaryById(id);
    }

    if (!item) {
      return res.status(404).json({ success: false, message: "Bestiary item not found." });
    }

    return res.json({ success: true, item: sanitizeItemImages(item) });
  } catch (error) {
    console.error("getBestiaryItem error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteBestiaryItems(req, res) {
  try {
    const { ids = [], view = "foundry" } = req.body;
    const user = req.user;
    const isAdmin = user.role === "admin";

    if (!ids.length) {
      return res.status(400).json({ success: false, message: "No IDs provided." });
    }

    if (view === "homebrew" || !isAdmin) {
      await deleteHomebrewBestiary(ids, isAdmin ? null : (user.id || user.user_id));
    } else {
      await deleteFoundryBestiary(ids);
    }

    return res.json({ success: true, message: `Deleted ${ids.length} bestiary item(s).` });
  } catch (error) {
    console.error("deleteBestiaryItems error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function adminListAllHomebrewBestiary(req, res) {
  try {
    const user = req.user;
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }

    const { user_id, search = "", limit = 200, offset = 0 } = req.query;
    const result = await listHomebrewBestiary({
      userId: user_id || null,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.json({ success: true, items: result.items, total: result.total });
  } catch (error) {
    console.error("adminListAllHomebrewBestiary error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateBestiaryItemImages(req, res) {
  try {
    const { id, view = "foundry", img_portrait, img_token } = req.body;
    const user = req.user;
    const isAdmin = user.role === "admin";

    if (!id) {
      return res.status(400).json({ success: false, message: "Item ID required." });
    }

    let item = (view === "homebrew")
      ? await getHomebrewBestiaryById(id, user.id || user.user_id)
      : await getFoundryBestiaryById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Bestiary item not found." });
    }

    const fvttId = item.fvtt_id || item.id || id;

    if (img_portrait) {
      const finalPort = await uploadExternalUrlToR2(img_portrait, fvttId, "portrait", user);
      item.img_portrait = finalPort;
      item.image = finalPort;
      if (!item.raw_data) item.raw_data = {};
      item.raw_data.img = finalPort;
    }

    if (img_token) {
      const finalToken = await uploadExternalUrlToR2(img_token, fvttId, "token", user);
      item.img_token = finalToken;
      if (!item.raw_data) item.raw_data = {};
      if (!item.raw_data.prototypeToken) item.raw_data.prototypeToken = {};
      if (!item.raw_data.prototypeToken.texture) item.raw_data.prototypeToken.texture = {};
      item.raw_data.prototypeToken.texture.src = finalToken;
      if (!item.raw_data.prototypeToken.ring) item.raw_data.prototypeToken.ring = { enabled: false };
      else if (typeof item.raw_data.prototypeToken.ring === "object") item.raw_data.prototypeToken.ring.enabled = false;
      else item.raw_data.prototypeToken.ring = false;
    }

    let saved;
    if (view === "homebrew" || (!isAdmin && view !== "foundry")) {
      saved = await upsertHomebrewBestiary({ ...item, user_id: user.id || user.user_id, user_name: user.username || user.user_name || "User" });
    } else {
      saved = await upsertFoundryBestiary(item);
    }

    return res.json({ success: true, message: "Images updated successfully.", item: saved });
  } catch (error) {
    console.error("updateBestiaryItemImages error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
