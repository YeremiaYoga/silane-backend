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

const SKILL_MAP = {
  acr: "Acrobatics",
  ani: "Animal Handling",
  arc: "Arcana",
  ath: "Athletics",
  dec: "Deception",
  his: "History",
  ins: "Insight",
  itm: "Intimidation",
  inv: "Investigation",
  med: "Medicine",
  nat: "Nature",
  prc: "Perception",
  prf: "Performance",
  per: "Persuasion",
  rel: "Religion",
  slt: "Sleight of Hand",
  ste: "Stealth",
  sur: "Survival",
};

function parseSkills(skillsObj) {
  if (!skillsObj || typeof skillsObj !== "object") return [];
  const list = [];
  Object.entries(skillsObj).forEach(([code, sk]) => {
    if (!sk) return;
    const name = SKILL_MAP[code] || (code.charAt(0).toUpperCase() + code.slice(1));
    const mod = sk.total ?? sk.mod ?? sk.value ?? 0;
    if (sk.proficient || sk.value || mod !== 0) {
      list.push({ name, mod, label: `${name.toUpperCase()} | ${mod >= 0 ? "+" : ""}${mod}` });
    }
  });
  return list;
}

function parseSenses(sensesObj) {
  if (!sensesObj || typeof sensesObj !== "object") return [];
  const list = [];
  if (sensesObj.truesight) list.push(`TRUESIGHT | ${sensesObj.truesight}`);
  if (sensesObj.darkvision) list.push(`DARKVISION | ${sensesObj.darkvision}`);
  if (sensesObj.blindsight) list.push(`BLINDSIGHT | ${sensesObj.blindsight}`);
  if (sensesObj.tremorsense) list.push(`TREMORSENSE | ${sensesObj.tremorsense}`);
  if (sensesObj.special) list.push(sensesObj.special.toUpperCase());
  return list;
}

function parseTraitsArray(arr) {
  if (!arr) return [];
  const val = Array.isArray(arr) ? arr : arr.value || [];
  return val.map((x) => (typeof x === "string" ? x.toUpperCase() : x));
}

function classifyFoundryItem(it) {
  const itType = (it.type || "").toLowerCase();
  if (itType === "spell") {
    return "spells";
  }

  const actType = (it.system?.activation?.type || "").toLowerCase();
  const sysTypeVal = (it.system?.type?.value || "").toLowerCase();
  const sysTypeLabel = (it.system?.type?.label || "").toLowerCase();
  const featType = (it.system?.type || "").toString().toLowerCase();

  const activities = it.system?.activities ? Object.values(it.system.activities) : [];
  const activityActTypes = activities.map((a) => (a.activation?.type || "").toLowerCase());

  const isLegendary =
    actType === "legendary" ||
    actType === "lair" ||
    sysTypeVal === "legendary" ||
    sysTypeVal === "lair" ||
    sysTypeLabel.includes("legendary") ||
    featType.includes("legendary") ||
    activityActTypes.includes("legendary") ||
    activityActTypes.includes("lair");

  if (isLegendary) {
    return "legendary_actions";
  }

  const isReaction =
    actType.includes("reaction") ||
    sysTypeVal.includes("reaction") ||
    sysTypeLabel.includes("reaction") ||
    featType.includes("reaction") ||
    activityActTypes.some((a) => a.includes("reaction"));

  if (isReaction) {
    return "reactions";
  }

  const isAction =
    actType === "action" ||
    actType === "bonus" ||
    actType === "minute" ||
    actType === "hour" ||
    sysTypeVal === "action" ||
    sysTypeVal === "bonus" ||
    itType === "weapon" ||
    itType === "equipment" ||
    itType === "consumable" ||
    activityActTypes.includes("action") ||
    activityActTypes.includes("bonus");

  if (isAction) {
    return "actions";
  }

  return "features";
}

function extractFormatData(rawItem) {
  const system = rawItem.system || {};
  const details = system.details || {};
  const attributes = system.attributes || {};
  const traits = system.traits || {};
  const abilities = system.abilities || {};
  const rawItems = Array.isArray(rawItem.items) ? rawItem.items : [];

  const itemsMap = {
    features: [],
    actions: [],
    reactions: [],
    legendary_actions: [],
    spells: [],
  };

  rawItems.forEach((it) => {
    const itType = it.type;

    const parsedItem = {
      ...it,
      name: it.name || "Unnamed",
      type: itType,
      image: ensureHttps(it.img || ""),
      description: it.system?.description?.value || "",
      activation: it.system?.activation || {},
      range: it.system?.range || {},
      target: it.system?.target || {},
      uses: it.system?.uses || {},
      roll: it.system?.formula || it.system?.damage?.parts?.[0]?.[0] || "",
      save: it.system?.save || {},
    };

    const category = classifyFoundryItem(it);

    if (category === "spells") {
      itemsMap.spells.push({
        ...parsedItem,
        level: it.system?.level ?? 0,
        school: it.system?.school || "",
        components: it.system?.components || {},
      });
    } else {
      itemsMap[category].push(parsedItem);
    }
  });

  const parsedSkills = parseSkills(system.skills);
  const parsedSenses = parseSenses(traits.senses);
  const dr = parseTraitsArray(traits.dr);
  const di = parseTraitsArray(traits.di);
  const dv = parseTraitsArray(traits.dv);
  const ci = parseTraitsArray(traits.ci);
  const languages = parseTraitsArray(traits.languages);
  const habitat = details.habitat || details.environment || system.environment || null;
  const treasure = details.treasure || system.treasure || null;
  const rawImg =
    rawItem.img ||
    rawItem.system?.img ||
    rawItem.image ||
    rawItem.portrait ||
    rawItem.system?.details?.img ||
    null;

  const tokenRaw =
    rawItem.prototypeToken?.texture?.src ||
    rawItem.prototypeToken?.ring?.subject?.texture ||
    rawItem.prototypeToken?.img ||
    rawItem.token?.texture?.src ||
    rawItem.token?.img ||
    rawItem.system?.prototypeToken?.texture?.src ||
    null;

  let img_portrait = ensureHttps(rawImg || tokenRaw || "");
  let img_token = ensureHttps(tokenRaw || rawImg || "");

  return {
    name: rawItem.name || "Unknown Creature",
    image: img_portrait || img_token,
    img_portrait: img_portrait,
    img_token: img_token,
    size: traits.size || "med",
    creature_type: details.type?.value || (typeof details.race === "string" ? details.race : "monster"),
    subtype: details.type?.subtype || "",
    alignment: details.alignment || "",
    cr: details.cr ?? 0,
    xp: details.xp?.value ?? 0,
    proficiency: attributes.prof ?? 0,
    ac: attributes.ac?.value || attributes.ac?.flat || 10,
    hp: {
      value: attributes.hp?.value || 0,
      max: attributes.hp?.max || 0,
      temp: attributes.hp?.temp || 0,
      formula: attributes.hp?.formula || "",
    },
    speed: attributes.movement || { walk: 30 },
    abilities: {
      str: { value: abilities.str?.value || 10, mod: abilities.str?.mod || 0, save: abilities.str?.save || 0 },
      dex: { value: abilities.dex?.value || 10, mod: abilities.dex?.mod || 0, save: abilities.dex?.save || 0 },
      con: { value: abilities.con?.value || 10, mod: abilities.con?.mod || 0, save: abilities.con?.save || 0 },
      int: { value: abilities.int?.value || 10, mod: abilities.int?.mod || 0, save: abilities.int?.save || 0 },
      wis: { value: abilities.wis?.value || 10, mod: abilities.wis?.mod || 0, save: abilities.wis?.save || 0 },
      cha: { value: abilities.cha?.value || 10, mod: abilities.cha?.mod || 0, save: abilities.cha?.save || 0 },
    },
    skills: parsedSkills,
    senses: parsedSenses,
    damage_resistances: dr,
    damage_immunities: di,
    damage_vulnerabilities: dv,
    condition_immunities: ci,
    languages: languages,
    habitat: habitat,
    treasure: treasure,
    biography: details.biography?.value || "",
    features: itemsMap.features,
    actions: itemsMap.actions,
    reactions: itemsMap.reactions,
    legendary_actions: itemsMap.legendary_actions,
    spells: itemsMap.spells,
  };
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

      // Extract format_data and items
      const extracted = extractFormatData(rawData);
      const formatData = {
        ...extracted,
        img_portrait: item.img_portrait || extracted.img_portrait,
        img_token: item.img_token || extracted.img_token,
        image: item.img_portrait || extracted.image,
      };

      item.format_data = formatData;
      item.features = extracted.features || [];
      item.actions = extracted.actions || [];
      item.reactions = extracted.reactions || [];
      item.legendary_actions = extracted.legendary_actions || [];
      item.spells = extracted.spells || [];
      item.skills = extracted.skills || item.skills || [];
      item.senses = extracted.senses || item.senses || [];
      item.abilities = extracted.abilities || item.abilities || {};
      item.ac = item.ac ?? extracted.ac;
      item.hp = item.hp || extracted.hp;
      item.speed = item.speed || extracted.speed;
      item.size = item.size || extracted.size;
      item.alignment = item.alignment || extracted.alignment;
      item.cr = item.cr ?? extracted.cr;
      item.xp = item.xp ?? extracted.xp;
      item.proficiency = item.proficiency ?? extracted.proficiency;
      item.creature_type = item.creature_type || extracted.creature_type;
      item.subtype = item.subtype || extracted.subtype;
      item.damage_resistances = extracted.damage_resistances || [];
      item.damage_immunities = extracted.damage_immunities || [];
      item.damage_vulnerabilities = extracted.damage_vulnerabilities || [];
      item.condition_immunities = extracted.condition_immunities || [];
      item.languages = extracted.languages || [];
      item.habitat = extracted.habitat || null;
      item.treasure = extracted.treasure || null;
      item.biography = extracted.biography || null;

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
