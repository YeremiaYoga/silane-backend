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
    const userIdentifier = user.silane_id || user.public_id || user.id || user.username || "user";

    const suffix = image_type === "portrait" || image_type === "port" ? "port" : "token";
    const customFileName = `${fvtt_id}-${suffix}.webp`;

    const adminBucket = (process.env.IGNITE_BUCKET_NAME || "projectignite").trim();
    const adminDomain = (process.env.IGNITE_PUBLIC_DOMAIN || "https://019a0f6bb5a27dc5b6ab32a19a8ad5d6.phanneldeliver.my.id").trim();
    const silaneBucket = (process.env.SILANE_BUCKET_NAME || "silane").trim();
    const silaneDomain = (process.env.SILANE_PUBLIC_DOMAIN || "https://sih4storage.phanneldeliver.my.id").trim();

    let folderName = "";
    let bucketName = "";
    let domainUrl = "";

    if (isAdmin) {
      folderName = "bestiary";
      bucketName = adminBucket;
      domainUrl = adminDomain;
    } else {
      folderName = userIdentifier;
      bucketName = silaneBucket;
      domainUrl = silaneDomain;
    }

    const publicUrl = await uploadAssetToR2({
      file,
      folderName,
      customFileName,
      bucketName,
      domainUrl,
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

const INTERNAL_CDN_BASE = "https://019a0f6bb5a27dc5b6ab32a19a8ad5d6.phanneldeliver.my.id/foundryvtt";
const GENERIC_FEATURE_FULL_URL = `${INTERNAL_CDN_BASE}/systems/dnd5e/icons/svg/items/feature.svg`;

export function formatImageUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return urlStr;
  let str = urlStr.trim();

  if (str.startsWith("data:")) return str;

  if (/plutonium/i.test(str)) {
    return GENERIC_FEATURE_FULL_URL;
  }

  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }

  let clean = str.startsWith("/") ? str.slice(1) : str;

  if (clean.startsWith("icons/")) {
    return `${INTERNAL_CDN_BASE}/${clean.slice(6)}`;
  }

  if (clean.startsWith("systems/")) {
    return `${INTERNAL_CDN_BASE}/${clean}`;
  }

  return `${INTERNAL_CDN_BASE}/${clean}`;
}

export function ensureHttps(urlStr) {
  return formatImageUrl(urlStr);
}

export function clean5eToolsText(str) {
  if (!str || typeof str !== "string") return str;
  let result = str;
  result = result.replace(/<a\s+[^>]*href=["'][^"']*(?:5e\.tools?|5etools)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, "$1");
  result = result.replace(/\[([^\]]+)\]\((?:https?:\/\/)?(?:[^\s\)]*)(?:5e\.tools?|5etools)[^\s\)]*\)/gi, "$1");
  result = result.replace(/\{@(?:link|5etools)\s+[^}]*(?:5e\.tools?|5etools)[^}]*\|([^}]+)\}/gi, "$1");
  result = result.replace(/\{@(?:link|5etools)\s+([^|}]+)\|[^}]*(?:5e\.tools?|5etools)[^}]*\}/gi, "$1");
  result = result.replace(/\{@(?:link|5etools)\s+(?:https?:\/\/)?(?:[^\s}]*)(?:5e\.tools?|5etools)[^\s}]*\s+([^}]+)\}/gi, "$1");
  result = result.replace(/\{@(?:link|5etools)\s+(?:https?:\/\/)?(?:[^\s}]*)(?:5e\.tools?|5etools)[^\s}]*\}/gi, "");
  result = result.replace(/https?:\/\/[^\s<"'>]*(?:5e\.tools?|5etools)[^\s<"'>]*/gi, "");
  return result;
}

export function clean5eToolsBiography(raw) {
  if (!raw || typeof raw !== "object") return;
  if (raw.system?.details?.biography?.value) {
    raw.system.details.biography.value = clean5eToolsText(raw.system.details.biography.value);
  }
  if (raw.system?.details?.biography?.public) {
    raw.system.details.biography.public = clean5eToolsText(raw.system.details.biography.public);
  }
  if (typeof raw.system?.details?.biography === "string") {
    raw.system.details.biography = clean5eToolsText(raw.system.details.biography);
  }
  if (raw.biography) {
    if (typeof raw.biography === "string") {
      raw.biography = clean5eToolsText(raw.biography);
    } else if (typeof raw.biography === "object") {
      if (raw.biography.value) raw.biography.value = clean5eToolsText(raw.biography.value);
      if (raw.biography.public) raw.biography.public = clean5eToolsText(raw.biography.public);
    }
  }
}

export function sanitizeItemImages(item) {
  if (!item) return item;
  if (item.image) item.image = formatImageUrl(item.image);
  if (item.img_portrait) item.img_portrait = formatImageUrl(item.img_portrait);
  if (item.img_token) item.img_token = formatImageUrl(item.img_token);
  cleanPlutoniumFlags(item);
  if (item.biography) item.biography = clean5eToolsText(item.biography);
  return item;
}

export async function uploadExternalUrlToR2(urlStr, fvttId, imageType, user) {
  if (!urlStr || typeof urlStr !== "string") return urlStr;
  let str = urlStr.trim();
  if (str.startsWith("data:")) return str;

  const isAdmin = user?.role === "admin";
  const userIdentifier = user?.silane_id || user?.public_id || user?.id || user?.username || "user";

  const adminBucket = (process.env.IGNITE_BUCKET_NAME || "projectignite").trim();
  const adminDomain = (process.env.IGNITE_PUBLIC_DOMAIN || "https://019a0f6bb5a27dc5b6ab32a19a8ad5d6.phanneldeliver.my.id").trim();
  const silaneBucket = (process.env.SILANE_BUCKET_NAME || "silane").trim();
  const silaneDomain = (process.env.SILANE_PUBLIC_DOMAIN || "https://sih4storage.phanneldeliver.my.id").trim();

  const cleanAdminDomain = adminDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cleanSilaneDomain = silaneDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (isAdmin) {
    if (cleanAdminDomain && str.includes(cleanAdminDomain) && str.includes("/bestiary/")) return str;
  } else {
    if (cleanSilaneDomain && str.includes(cleanSilaneDomain) && str.includes(`/${userIdentifier}/`)) return str;
  }

  try {
    let fetchUrl = str;
    if (!str.startsWith("http://") && !str.startsWith("https://")) {
      fetchUrl = formatImageUrl(str);
    }

    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) return formatImageUrl(str);

    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = fetchRes.headers.get("content-type") || "image/webp";

    const suffix = imageType === "portrait" || imageType === "port" ? "port" : "token";
    const customFileName = `${fvttId}-${suffix}.webp`;

    const folderName = isAdmin ? "bestiary" : userIdentifier;
    const bucketName = isAdmin ? adminBucket : silaneBucket;
    const domainUrl = isAdmin ? adminDomain : silaneDomain;

    const publicUrl = await uploadAssetToR2({
      file: { buffer, mimetype: contentType, originalname: customFileName },
      folderName,
      customFileName,
      bucketName,
      domainUrl,
    });

    return publicUrl || formatImageUrl(str);
  } catch (err) {
    console.warn(`uploadExternalUrlToR2 failed for ${str}:`, err.message);
    return formatImageUrl(str);
  }
}

export function cleanPlutoniumFlags(obj) {
  if (!obj || typeof obj !== "object") return obj;

  clean5eToolsBiography(obj);

  if (Array.isArray(obj)) {
    obj.forEach((it) => cleanPlutoniumFlags(it));
    return obj;
  }

  if (obj.flags && typeof obj.flags === "object") {
    delete obj.flags.plutonium;
    Object.keys(obj.flags).forEach((k) => {
      if (k.toLowerCase().includes("plutonium")) {
        delete obj.flags[k];
      }
    });
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string") {
      if (/plutonium/i.test(val)) {
        obj[key] = GENERIC_FEATURE_FULL_URL;
      } else if (key === "img" || key === "image" || key === "src") {
        obj[key] = formatImageUrl(val);
      } else if (/(?:5e\.tools?|5etools)/i.test(val)) {
        obj[key] = clean5eToolsText(val);
      }
    } else if (val && typeof val === "object") {
      cleanPlutoniumFlags(val);
    }
  }

  return obj;
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
    const profVal = sk.value ?? (sk.proficient ? 1 : 0);
    const mod = sk.total ?? sk.mod ?? 0;
    if (profVal > 0 || sk.proficient || mod !== 0) {
      list.push({ name, value: profVal || 1 });
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

export function extractSource(rawItem, item) {
  if (item?.source && typeof item.source === "string" && item.source.trim() !== "" && item.source !== "Ignite") {
    return item.source.trim();
  }

  const flags = rawItem?.flags || item?.flags || {};
  if (flags?.plutonium?.source && typeof flags.plutonium.source === "string" && flags.plutonium.source.trim() !== "") {
    return flags.plutonium.source.trim();
  }

  const system = rawItem?.system || item?.system || {};
  const details = system?.details || {};
  const srcVal = details.source || rawItem?.source || item?.source || system.source;

  if (typeof srcVal === "string" && srcVal.trim() !== "") {
    return srcVal.trim();
  }
  if (typeof srcVal === "object" && srcVal !== null) {
    const custom = srcVal.custom || srcVal.book || srcVal.label || srcVal.name || srcVal.rules;
    if (custom && typeof custom === "string" && custom.trim() !== "") {
      return custom.trim();
    }
  }
  return "SRD 5.2";
}

export function calculateProficiency(cr) {
  let numericCr = 0;
  if (typeof cr === "number") {
    numericCr = cr;
  } else if (typeof cr === "string") {
    if (cr === "1/8" || cr === "0.125") numericCr = 0.125;
    else if (cr === "1/4" || cr === "0.25") numericCr = 0.25;
    else if (cr === "1/2" || cr === "0.5") numericCr = 0.5;
    else numericCr = parseFloat(cr) || 0;
  }

  if (numericCr >= 29) return 9;
  if (numericCr >= 25) return 8;
  if (numericCr >= 21) return 7;
  if (numericCr >= 17) return 6;
  if (numericCr >= 13) return 5;
  if (numericCr >= 9) return 4;
  if (numericCr >= 5) return 3;
  return 2;
}

function extractItemRoll(it) {
  if (!it) return "";
  const system = it.system || it;

  if (typeof it.roll === "string" && it.roll.trim()) {
    const r = it.roll.trim();
    if (!r.includes("d") && (r.startsWith("+") || r.startsWith("-") || r.toUpperCase().includes("CON") || r.toUpperCase().includes("DEX") || r.toUpperCase().includes("WIS") || r.toUpperCase().includes("STR") || r.toUpperCase().includes("INT") || r.toUpperCase().includes("CHA"))) {
      return r;
    }
  }

  const saveObj = system.save || it.save;
  if (saveObj) {
    const abil = saveObj.ability || saveObj.abil;
    const dcVal = typeof saveObj.dc === "object" ? (saveObj.dc?.value ?? saveObj.dc?.formula ?? saveObj.dc?.flat) : saveObj.dc;
    if (abil && (dcVal !== undefined && dcVal !== null && dcVal !== "")) {
      return `${String(abil).toUpperCase()} ${dcVal}`;
    }
  }

  const atkBonus = system.attackBonus ?? system.bonus ?? system.attack?.bonus ?? it.attackBonus ?? it.bonus;
  if (atkBonus !== undefined && atkBonus !== null && atkBonus !== "") {
    const num = Number(atkBonus);
    return !isNaN(num) ? `${num >= 0 ? "+" : ""}${num}` : String(atkBonus);
  }

  const activities = system.activities ? Object.values(system.activities) : [];
  for (const act of activities) {
    if (!act) continue;

    if (act.type === "save" || act.save) {
      const s = act.save || {};
      const abil = s.ability;
      const dcVal = typeof s.dc === "object" ? (s.dc?.value ?? s.dc?.formula ?? s.dc?.flat) : s.dc;
      if (abil && (dcVal !== undefined && dcVal !== null && dcVal !== "")) {
        return `${String(abil).toUpperCase()} ${dcVal}`;
      }
    }

    if (act.type === "attack" || act.attack) {
      const atk = act.attack || {};
      const bonus = atk.bonus ?? act.bonus;
      if (bonus !== undefined && bonus !== null && bonus !== "") {
        const num = Number(bonus);
        return !isNaN(num) ? `${num >= 0 ? "+" : ""}${num}` : String(bonus);
      }
      if (atk.flat && atk.value) {
        const num = Number(atk.value);
        return !isNaN(num) ? `${num >= 0 ? "+" : ""}${num}` : String(atk.value);
      }
    }
  }

  if (typeof it.roll === "string" && it.roll.trim() && !it.roll.includes("d")) {
    return it.roll.trim();
  }

  return "";
}

function extractItemFormula(it) {
  if (!it) return "";
  const system = it.system || it;

  if (typeof it.formula === "string" && it.formula.trim()) {
    return it.formula.trim();
  }
  if (typeof it.roll === "string" && it.roll.trim() && it.roll.includes("d")) {
    return it.roll.trim();
  }
  if (typeof system.formula === "string" && system.formula.trim()) {
    return system.formula.trim();
  }

  const parts = system.damage?.parts || it.damage?.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const formulas = parts
      .map((p) => {
        if (Array.isArray(p)) return p[0];
        if (typeof p === "object" && p !== null) return p.formula || p.custom?.formula || p[0];
        if (typeof p === "string") return p;
        return null;
      })
      .filter(Boolean);

    if (formulas.length > 0) {
      return formulas.join(" + ");
    }
  }

  const activities = system.activities ? Object.values(system.activities) : [];
  for (const act of activities) {
    if (!act) continue;

    const actParts = act.damage?.parts;
    if (Array.isArray(actParts) && actParts.length > 0) {
      const formulas = actParts
        .map((p) => {
          if (Array.isArray(p)) return p[0];
          if (typeof p === "object" && p !== null) return p.formula || p.custom?.formula || p[0];
          if (typeof p === "string") return p;
          return null;
        })
        .filter(Boolean);

      if (formulas.length > 0) {
        return formulas.join(" + ");
      }
    }

    if (act.healing?.formula) {
      return act.healing.formula;
    }
    if (act.formula) {
      return act.formula;
    }
  }

  return "";
}

function extractFormatData(rawItem) {
  const system = rawItem.system || {};
  const details = system.details || {};
  const attributes = system.attributes || {};
  const traits = system.traits || {};
  const abilities = system.abilities || {};
  let rawItems = Array.isArray(rawItem.items) ? rawItem.items : [];

  if (rawItems.length === 0) {
    rawItems = [
      ...(rawItem.features || []),
      ...(rawItem.actions || []),
      ...(rawItem.reactions || []),
      ...(rawItem.legendary_actions || []),
      ...(rawItem.spells || []),
    ];
  }

  const crVal = details.cr ?? rawItem.cr ?? 0;
  const computedProf = calculateProficiency(crVal);
  const profVal = (attributes.prof && attributes.prof > 0) ? attributes.prof : computedProf;

  const itemsMap = {
    features: [],
    actions: [],
    reactions: [],
    legendary_actions: [],
    spells: [],
  };

  const seenKeys = {
    features: new Set(),
    actions: new Set(),
    reactions: new Set(),
    legendary_actions: new Set(),
    spells: new Set(),
  };

  rawItems.forEach((it) => {
    if (!it || !it.name) return;
    const itType = it.type;

    const parsedItem = {
      ...it,
      name: it.name || "Unnamed",
      type: itType,
      image: ensureHttps(it.img || it.image || ""),
      description: it.system?.description?.value || it.description || "",
      activation: it.system?.activation || it.activation || {},
      duration: it.system?.duration || it.duration || {},
      range: it.system?.range || it.range || {},
      target: it.system?.target || it.target || {},
      uses: it.system?.uses || it.uses || {},
      roll: extractItemRoll(it),
      formula: extractItemFormula(it),
      save: it.system?.save || it.save || {},
    };

    const category = classifyFoundryItem(it);
    const itemKey = `${(itType || category).toLowerCase()}:${it.name.trim().toLowerCase()}`;

    if (seenKeys[category] && seenKeys[category].has(itemKey)) return;
    if (seenKeys[category]) seenKeys[category].add(itemKey);

    if (category === "spells") {
      itemsMap.spells.push({
        ...parsedItem,
        level: it.system?.level ?? it.level ?? 0,
        school: it.system?.school || it.school || "",
        components: it.system?.components || it.components || {},
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
    proficiency: profVal,
    ac: attributes.ac?.value || attributes.ac?.flat || 10,
    hp: {
      value: attributes.hp?.value || 0,
      max: attributes.hp?.max || 0,
      temp: attributes.hp?.temp || 0,
      formula: attributes.hp?.formula || "",
    },
    speed: attributes.movement || { walk: 30 },
    abilities: (system.abilities && Object.keys(system.abilities).length > 0)
      ? system.abilities
      : (rawItem.abilities || {
          str: abilities.str || { value: 10 },
          dex: abilities.dex || { value: 10 },
          con: abilities.con || { value: 10 },
          int: abilities.int || { value: 10 },
          wis: abilities.wis || { value: 10 },
          cha: abilities.cha || { value: 10 },
        }),
    skills: parsedSkills,
    senses: parsedSenses,
    damage_resistances: dr,
    damage_immunities: di,
    damage_vulnerabilities: dv,
    condition_immunities: ci,
    languages: languages,
    habitat: habitat,
    treasure: treasure,
    biography: clean5eToolsText(details.biography?.value || (typeof details.biography === "string" ? details.biography : null)),
    public_biography: clean5eToolsText(details.biography?.public || null),
    appearance: details.appearance || null,
    personality_traits: details.trait || null,
    ideals: details.ideal || null,
    bonds: details.bond || null,
    flaws: details.flaw || null,
    characteristics: {
      ...(details.alignment ? { alignment: details.alignment } : {}),
      ...(details.gender ? { gender: details.gender } : {}),
      ...(details.age ? { age: details.age } : {}),
      ...(details.height ? { height: details.height } : {}),
      ...(details.weight ? { weight: details.weight } : {}),
      ...(details.eyes ? { eyes: details.eyes } : {}),
      ...(details.skin ? { skin: details.skin } : {}),
      ...(details.hair ? { hair: details.hair } : {}),
      ...(details.faith ? { faith: details.faith } : {}),
    },
    source: extractSource(rawItem),
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

      const rawData = (item.raw_data && Object.keys(item.raw_data).length > 0)
        ? JSON.parse(JSON.stringify(item.raw_data))
        : JSON.parse(JSON.stringify(item));

      const extractedSource = extractSource(rawData, item);
      cleanPlutoniumFlags(rawData);

      rawData.img = ensureHttps(item.img_portrait || item.image || rawData.img || "icons/svg/mystery-man.svg");
      if (!rawData.prototypeToken) rawData.prototypeToken = {};
      if (!rawData.prototypeToken.texture) rawData.prototypeToken.texture = {};
      rawData.prototypeToken.texture.src = ensureHttps(item.img_token || item.img_portrait || rawData.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg");

      if (!rawData.prototypeToken.ring) {
        rawData.prototypeToken.ring = { enabled: false };
      } else if (typeof rawData.prototypeToken.ring === "object") {
        rawData.prototypeToken.ring.enabled = false;
      } else {
        rawData.prototypeToken.ring = false;
      }

      if (Array.isArray(rawData.items)) {
        const uniqueItems = [];
        const seen = new Set();
        for (const it of rawData.items) {
          if (!it || !it.name) continue;
          const key = `${(it.type || "item").toLowerCase()}:${it.name.trim().toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          uniqueItems.push(it);
        }
        rawData.items = uniqueItems;
      }

      item.raw_data = rawData;

      const extracted = extractFormatData(rawData);
      const formatData = {
        ...extracted,
        source: extractedSource,
        img_portrait: item.img_portrait || extracted.img_portrait,
        img_token: item.img_token || extracted.img_token,
        image: item.img_portrait || extracted.image,
      };

      cleanPlutoniumFlags(formatData);

      item.format_data = formatData;
      item.source = extractedSource;
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
      item.biography = extracted.biography || item.biography || null;
      item.public_biography = extracted.public_biography || item.public_biography || null;
      item.appearance = extracted.appearance || item.appearance || null;
      item.personality_traits = extracted.personality_traits || item.personality_traits || null;
      item.ideals = extracted.ideals || item.ideals || null;
      item.bonds = extracted.bonds || item.bonds || null;
      item.flaws = extracted.flaws || item.flaws || null;
      item.characteristics = extracted.characteristics || item.characteristics || {};

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
    const { view = "foundry", search = "", limit = 200, offset = 0, type = "", all = "false" } = req.query;

    let result;
    if (view === "homebrew") {
      const targetUserId = (all === "true" || isAdmin) ? (req.query.user_id || null) : (user.id || user.user_id);
      result = await listHomebrewBestiary({
        userId: targetUserId,
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

    const itemsToDelete = [];
    for (const id of ids) {
      let item;
      if (view === "homebrew" || !isAdmin) {
        item = await getHomebrewBestiaryById(id, isAdmin ? null : (user.id || user.user_id));
      } else {
        item = await getFoundryBestiaryById(id);
      }
      if (item) itemsToDelete.push(item);
    }

    if (view === "homebrew" || !isAdmin) {
      await deleteHomebrewBestiary(ids, isAdmin ? null : (user.id || user.user_id));
    } else {
      await deleteFoundryBestiary(ids);
    }

    const r2Domain = (process.env.SILANE_PUBLIC_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const r2PublicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

    for (const item of itemsToDelete) {
      const imageUrls = new Set();
      if (item.image) imageUrls.add(item.image);
      if (item.img_portrait) imageUrls.add(item.img_portrait);
      if (item.img_token) imageUrls.add(item.img_token);
      if (item.raw_data?.img) imageUrls.add(item.raw_data.img);
      if (item.raw_data?.prototypeToken?.texture?.src) imageUrls.add(item.raw_data.prototypeToken.texture.src);

      for (const url of imageUrls) {
        if (!url || typeof url !== "string") continue;
        const formatted = ensureHttps(url);
        const isR2 =
          (r2Domain && formatted.includes(r2Domain)) ||
          (r2PublicUrl && formatted.includes(r2PublicUrl)) ||
          formatted.includes("r2.cloudflarestorage.com") ||
          formatted.includes("channeldeliver.my.id") ||
          formatted.includes("pub-") ||
          formatted.includes("projectignite");

        if (isR2) {
          try {
            await deleteAssetFromR2(formatted);
          } catch (err) {
            console.warn(`Failed to delete R2 image ${formatted}:`, err.message);
          }
        }
      }
    }

    return res.json({ success: true, message: `Deleted ${ids.length} bestiary item(s) and their images.` });
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

export async function cleanDatabasePlutonium(req, res) {
  try {
    const user = req.user;
    if (user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }

    let cleanedCount = 0;

    const { items: fbItems } = await listFoundryBestiary({ limit: 5000 });
    for (const item of fbItems) {
      const stringifiedBefore = JSON.stringify(item);
      cleanPlutoniumFlags(item);
      if (JSON.stringify(item) !== stringifiedBefore) {
        await upsertFoundryBestiary(item);
        cleanedCount++;
      }
    }

    const { items: hbItems } = await listHomebrewBestiary({ userId: null, limit: 5000 });
    for (const item of hbItems) {
      const stringifiedBefore = JSON.stringify(item);
      cleanPlutoniumFlags(item);
      if (JSON.stringify(item) !== stringifiedBefore) {
        await upsertHomebrewBestiary(item);
        cleanedCount++;
      }
    }

    return res.json({
      success: true,
      message: `Database cleaned successfully. Sanitized ${cleanedCount} records.`,
      cleanedCount,
    });
  } catch (error) {
    console.error("cleanDatabasePlutonium error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
