import {
  bulkInsertWeapons,
  bulkInsertConsumables,
  bulkInsertContainers,
  bulkInsertEquipments,
  bulkInsertLoots,
  bulkInsertTools,
  bulkInsertSpells,
  bulkInsertFeats,
  bulkInsertFeatures,
  listItemsByType,
  listItemsAllTypes,
  getItemById,
  deleteItemsByIds,
  isValidFireflyType,
  getValidTypes,
  // Homebrew
  bulkInsertHomebrewWeapons,
  bulkInsertHomebrewConsumables,
  bulkInsertHomebrewContainers,
  bulkInsertHomebrewEquipments,
  bulkInsertHomebrewLoots,
  bulkInsertHomebrewTools,
  bulkInsertHomebrewSpells,
  bulkInsertHomebrewFeats,
  isValidHomebrewType,
  getHomebrewValidTypes,
  listHomebrewItemsByType,
  listHomebrewAllTypes,
  getHomebrewItemById,
  deleteHomebrewItemsByIds,
  // Heralds Firefly
  getHeraldsFireflyByUserId,
  createHeraldsFirefly,
  appendToHeraldsFirefly,
  removeFromHeraldsFirefly,
  // Admin: all homebrew
  listAllHomebrewItems,
} from "../models/fireflyModel.js";

// ==========================================
// CONSTANTS & HELPERS (referensi dari admin project-ignite)
// ==========================================

const ALLOWED_TYPES = getValidTypes();
const HOMEBREW_TYPES = getHomebrewValidTypes();

// Map type ke kolom di heralds_firefly
const TYPE_TO_FIREFLY_COLUMN = {
  weapon: "weapons",
  consumable: "consumables",
  container: "containers",
  equipment: "equipments",
  feat: "feats",
  loot: "loots",
  spell: "spells",
  tool: "tools",
};

function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid item JSON");
  const name = raw.name || "Unknown Item";
  const type = raw.type || "unknown";
  const img = raw.img || raw.system?.img || null;
  const system = raw.system ?? {};
  const effects = Array.isArray(raw.effects) ? raw.effects : [];
  return { name, type, img, system, effects };
}

function resolveImage(itemImg) {
  if (!itemImg) return null;
  if (/^https?:\/\//i.test(itemImg)) return itemImg;
  return itemImg; // simpan path apa adanya
}

function getCompendiumSource(rawItem) {
  return rawItem?._stats?.compendiumSource ?? null;
}

function getSourceBook(system) {
  return system?.source?.book ?? null;
}

function formatPrice(system) {
  const price = system?.price;
  if (!price) return null;
  const value = Number(price.value ?? 0);
  if (!Number.isFinite(value)) return null;
  const denom = (price.denomination || "cp").toLowerCase();
  const table = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
  return value * (table[denom] ?? 1);
}

function resolveFvttId(rawItem) {
  const compSource = rawItem?._stats?.compendiumSource;
  if (compSource && typeof compSource === "string") {
    const parts = compSource.split(".");
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length === 16) return lastPart;
  }
  return rawItem?._id || null;
}

function buildDamage(system) {
  const base = system?.damage?.base;
  if (!base || typeof base !== "object") return null;
  const number = base.number;
  const denomination = base.denomination;
  if (number === "" || number == null) return null;
  if (denomination === "" || denomination == null) return null;
  const n = Number(number);
  const d = Number(denomination);
  if (!Number.isFinite(n) || !Number.isFinite(d)) return null;
  const types = Array.isArray(base.types) ? base.types : [];
  const bonusRaw = base.bonus;
  const bonus = bonusRaw === "" || bonusRaw == null ? null : String(bonusRaw);
  const magical_bonus = `${n}d${d}` + (bonus ? (bonus.startsWith("-") ? bonus : `+${bonus}`) : "");
  return { types, number: n, denomination: d, bonus, magical_bonus };
}

// ==========================================
// BUILD PAYLOAD PER TYPE (kolom persis seperti admin)
// ==========================================

function buildWeaponPayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  const sysType = system?.type || {};
  const dmgBase = system?.damage?.base || {};
  return {
    name, type,
    fvtt_id: resolveFvttId(raw),
    rarity: system?.rarity ?? null,
    base_item: sysType.baseItem ?? null,
    type_value: sysType.value ?? null,
    damage_type: dmgBase?.types ?? null,
    damage: buildDamage(system),
    attunement: system?.attunement ?? null,
    properties: system?.properties ?? null,
    weight: system?.weight?.value ?? null,
    mastery: system?.mastery ?? null,
    compendium_source: getCompendiumSource(raw),
    price: formatPrice(system),
    source_book: getSourceBook(system),
    image: resolveImage(raw?.img || img),
    raw_data: raw,
    format_data: normalized,
  };
}

function buildConsumablePayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  const sysType = system?.type || {};
  return {
    name, type,
    type_value: sysType.value ?? null,
    subtype: sysType.subtype ?? null,
    weight: system?.weight?.value ?? null,
    properties: system?.properties ?? null,
    rarity: system?.rarity ?? null,
    compendium_source: getCompendiumSource(raw),
    price: formatPrice(system),
    source_book: getSourceBook(system),
    attunement: system?.attunement ?? null,
    image: resolveImage(raw?.img || img),
    raw_data: raw,
    format_data: normalized,
  };
}

function buildContainerPayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  return {
    name, type,
    properties: system?.properties ?? null,
    weight: system?.weight?.value ?? null,
    rarity: system?.rarity ?? null,
    compendium_source: getCompendiumSource(raw),
    price: formatPrice(system),
    source_book: getSourceBook(system),
    attunement: system?.attunement ?? null,
    image: resolveImage(raw?.img || img),
    raw_data: raw,
    format_data: normalized,
  };
}

function buildEquipmentPayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  const sysType = system?.type || {};
  return {
    name, type,
    type_value: sysType.value ?? null,
    base_item: sysType.baseItem ?? null,
    weight: system?.weight?.value ?? null,
    properties: system?.properties ?? null,
    rarity: system?.rarity ?? null,
    compendium_source: getCompendiumSource(raw),
    price: formatPrice(system),
    source_book: getSourceBook(system),
    attunement: system?.attunement ?? null,
    image: resolveImage(raw?.img || img),
    raw_data: raw,
    format_data: normalized,
  };
}

function buildLootPayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  const sysType = system?.type || {};
  return {
    name, type,
    type_value: sysType.value ?? null,
    base_item: sysType.baseItem ?? null,
    properties: system?.properties ?? null,
    rarity: system?.rarity ?? null,
    weight: system?.weight?.value ?? null,
    image: resolveImage(raw?.img || img),
    price: formatPrice(system),
    compendium_source: getCompendiumSource(raw),
    source_book: getSourceBook(system),
    raw_data: raw,
    format_data: normalized,
  };
}

function buildToolPayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  const sysType = system?.type || {};
  return {
    name, type,
    rarity: system?.rarity ?? null,
    base_item: sysType.baseItem ?? null,
    type_value: sysType.value ?? null,
    properties: system?.properties ?? null,
    weight: system?.weight?.value ?? null,
    attunement: system?.attunement ?? null,
    compendium_source: getCompendiumSource(raw),
    price: formatPrice(system),
    source_book: getSourceBook(system),
    image: resolveImage(raw?.img || img),
    raw_data: raw,
    format_data: normalized,
  };
}

function buildSpellPayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  return {
    name, type,
    properties: system?.properties ?? null,
    level: system?.level ?? null,
    school: system?.school ?? null,
    description: system?.description?.value ?? null,
    affects: system?.target?.affects ?? null,
    image: resolveImage(raw?.img || img),
    compendium_source: getCompendiumSource(raw),
    source_book: getSourceBook(system),
    price: null,
    activation: system?.activation ?? null,
    range: system?.range ?? null,
    template: system?.target?.template ?? null,
    materials: system?.materials ?? null,
    duration: system?.duration ?? null,
    raw_data: raw,
    format_data: normalized,
    classes: [],
    damage_type: [],
    subclasses: [],
    species: [],
    subspecies: [],
  };
}

function buildFeatPayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  return {
    name, type,
    feat_type: system?.type?.value ?? null,
    prerequisites: system?.prerequisites ?? {},
    fvtt_id: resolveFvttId(raw),
    requirements: system?.requirements ?? null,
    image: resolveImage(raw?.img || img),
    properties: system?.properties ?? [],
    uses: system?.uses ?? {},
    raw_data: raw,
    format_data: normalized,
  };
}

function buildFeaturePayload(raw, normalized) {
  const { name, type, system, img } = normalized;
  return {
    name, type,
    image: resolveImage(raw?.img || img),
    description: system?.description?.value ?? null,
    raw_data: raw,
    format_data: normalized,
    prerequisites: system?.prerequisites ?? {},
    properties: system?.properties ?? [],
    requirements: system?.requirements ?? null,
    uses: system?.uses ?? {},
  };
}

// ==========================================
// MAIN: Filter items dan group by type
// ==========================================

function filterAndGroupItems(rawItems) {
  const grouped = {};
  const rejected = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      rejected.push({ name: null, error: "Invalid JSON object" });
      continue;
    }

    const itemType = String(raw.type || "").toLowerCase();

    if (!ALLOWED_TYPES.includes(itemType)) {
      rejected.push({
        name: raw.name || "Unknown",
        type: raw.type,
        error: `Type "${raw.type}" not allowed. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      });
      continue;
    }

    try {
      const normalized = normalizeItem(raw);
      let payload;

      switch (itemType) {
        case "weapon": payload = buildWeaponPayload(raw, normalized); break;
        case "consumable": payload = buildConsumablePayload(raw, normalized); break;
        case "container": payload = buildContainerPayload(raw, normalized); break;
        case "equipment": payload = buildEquipmentPayload(raw, normalized); break;
        case "loot": payload = buildLootPayload(raw, normalized); break;
        case "tool": payload = buildToolPayload(raw, normalized); break;
        case "spell": payload = buildSpellPayload(raw, normalized); break;
        case "feat": payload = buildFeatPayload(raw, normalized); break;
        case "feature": payload = buildFeaturePayload(raw, normalized); break;
        default:
          rejected.push({ name: raw.name, error: `Unhandled type: ${itemType}` });
          continue;
      }

      if (!grouped[itemType]) grouped[itemType] = [];
      grouped[itemType].push(payload);
    } catch (err) {
      rejected.push({ name: raw.name || "Unknown", error: err.message });
    }
  }

  return { grouped, rejected };
}

// ==========================================
// CONTROLLERS
// ==========================================

/**
 * POST /api/firefly/import
 * Import items dari JSON. 
 * - Admin (role=admin) → simpan ke foundry_* tables
 * - User biasa → simpan ke *_homebrew tables + catat di heralds_firefly
 */
export const importFireflyItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.username || "Unknown";
    const userRole = req.user?.role;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const body = req.body;
    let rawItems = [];

    if (Array.isArray(body)) rawItems = body;
    else if (body?.items && Array.isArray(body.items)) rawItems = body.items;
    else if (body && typeof body === "object") rawItems = [body];
    else return res.status(400).json({ success: false, message: "Invalid request body" });

    if (rawItems.length === 0) {
      return res.status(400).json({ success: false, message: "No items to import" });
    }

    const { grouped, rejected } = filterAndGroupItems(rawItems);

    let totalInserted = 0;
    const results = {};

    const isAdmin = userRole === "admin";

    if (isAdmin) {
      // ==========================================
      // ADMIN — insert ke foundry_* tables (original)
      // ==========================================
      if (grouped.weapon?.length) {
        const inserted = await bulkInsertWeapons(grouped.weapon);
        results.weapon = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.consumable?.length) {
        const inserted = await bulkInsertConsumables(grouped.consumable);
        results.consumable = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.container?.length) {
        const inserted = await bulkInsertContainers(grouped.container);
        results.container = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.equipment?.length) {
        const inserted = await bulkInsertEquipments(grouped.equipment);
        results.equipment = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.loot?.length) {
        const inserted = await bulkInsertLoots(grouped.loot);
        results.loot = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.tool?.length) {
        const inserted = await bulkInsertTools(grouped.tool);
        results.tool = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.spell?.length) {
        const inserted = await bulkInsertSpells(grouped.spell);
        results.spell = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.feat?.length) {
        const inserted = await bulkInsertFeats(grouped.feat);
        results.feat = inserted.length;
        totalInserted += inserted.length;
      }
      if (grouped.feature?.length) {
        const inserted = await bulkInsertFeatures(grouped.feature);
        results.feature = inserted.length;
        totalInserted += inserted.length;
      }
    } else {
      // ==========================================
      // USER BIASA — insert ke *_homebrew tables + catat di heralds_firefly
      // ==========================================
      if (grouped.weapon?.length) {
        const inserted = await bulkInsertHomebrewWeapons(grouped.weapon, userId, userName);
        results.weapon = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "weapons", entries);
      }
      if (grouped.consumable?.length) {
        const inserted = await bulkInsertHomebrewConsumables(grouped.consumable, userId, userName);
        results.consumable = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "consumables", entries);
      }
      if (grouped.container?.length) {
        const inserted = await bulkInsertHomebrewContainers(grouped.container, userId, userName);
        results.container = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "containers", entries);
      }
      if (grouped.equipment?.length) {
        const inserted = await bulkInsertHomebrewEquipments(grouped.equipment, userId, userName);
        results.equipment = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "equipments", entries);
      }
      if (grouped.loot?.length) {
        const inserted = await bulkInsertHomebrewLoots(grouped.loot, userId, userName);
        results.loot = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "loots", entries);
      }
      if (grouped.tool?.length) {
        const inserted = await bulkInsertHomebrewTools(grouped.tool, userId, userName);
        results.tool = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "tools", entries);
      }
      if (grouped.spell?.length) {
        const inserted = await bulkInsertHomebrewSpells(grouped.spell, userId, userName);
        results.spell = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "spells", entries);
      }
      if (grouped.feat?.length) {
        const inserted = await bulkInsertHomebrewFeats(grouped.feat, userId, userName);
        results.feat = inserted.length;
        totalInserted += inserted.length;
        const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
        await appendToHeraldsFirefly(userId, "feats", entries);
      }
      // feature tidak ada di homebrew tables, skip
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${totalInserted} item(s) across ${Object.keys(results).length} type(s)${isAdmin ? " [ADMIN → foundry_*]" : " [USER → *_homebrew]"}`,
      imported: totalInserted,
      details: results,
      rejected: rejected.length,
      rejected_details: rejected,
      allowed_types: ALLOWED_TYPES,
      target: isAdmin ? "foundry" : "homebrew",
    });
  } catch (error) {
    console.error("❌ importFireflyItems error:", error);
    return res.status(500).json({ success: false, message: "Failed to import items", error: error.message });
  }
};

/**
 * GET /api/firefly/items
 * List items. Query: ?type=weapon&search=sword&limit=50&offset=0
 * - Admin → query dari foundry_* tables
 * - User biasa → query dari *_homebrew tables (milik user sendiri)
 */
export const listFireflyItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { type, search, limit = 50, offset = 0 } = req.query;
    const isAdmin = userRole === "admin";

    let items;
    if (isAdmin) {
      // Admin → foundry_* tables
      if (type && isValidFireflyType(type)) {
        items = await listItemsByType(type, { search, limit: Number(limit), offset: Number(offset) });
      } else {
        items = await listItemsAllTypes({ search, limit: Number(limit) });
      }
    } else {
      // User biasa → *_homebrew tables
      if (type && isValidHomebrewType(type)) {
        items = await listHomebrewItemsByType(type, userId, { search, limit: Number(limit), offset: Number(offset) });
      } else {
        items = await listHomebrewAllTypes(userId, { search, limit: Number(limit) });
      }
    }

    return res.status(200).json({ success: true, count: items.length, items, source: isAdmin ? "foundry" : "homebrew" });
  } catch (error) {
    console.error("❌ listFireflyItems error:", error);
    return res.status(500).json({ success: false, message: "Failed to list items", error: error.message });
  }
};

/**
 * GET /api/firefly/items/:type/:id
 */
export const getFireflyItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { type, id } = req.params;
    if (!isValidFireflyType(type)) {
      return res.status(400).json({ success: false, message: `Invalid type: ${type}` });
    }

    const item = await getItemById(type, id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("❌ getFireflyItem error:", error);
    return res.status(500).json({ success: false, message: "Failed to get item", error: error.message });
  }
};

/**
 * POST /api/firefly/delete
 * Body: { type: "weapon", ids: ["uuid1", "uuid2"] }
 * - Admin → hapus dari foundry_* tables
 * - User biasa → hapus dari *_homebrew tables + hapus dari heralds_firefly
 */
export const deleteFireflyItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { type, ids } = req.body;
    const isAdmin = userRole === "admin";

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids must be a non-empty array" });
    }

    if (isAdmin) {
      if (!type || !isValidFireflyType(type)) {
        return res.status(400).json({ success: false, message: "Valid type is required" });
      }
      await deleteItemsByIds(type, ids);
    } else {
      if (!type || !isValidHomebrewType(type)) {
        return res.status(400).json({ success: false, message: "Valid homebrew type is required" });
      }
      await deleteHomebrewItemsByIds(type, ids, userId);
      // Hapus juga dari heralds_firefly
      const column = TYPE_TO_FIREFLY_COLUMN[type];
      if (column) {
        await removeFromHeraldsFirefly(userId, column, ids);
      }
    }

    return res.status(200).json({ success: true, message: `Deleted ${ids.length} ${type} item(s)` });
  } catch (error) {
    console.error("❌ deleteFireflyItems error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete items", error: error.message });
  }
};

/**
 * GET /api/firefly/items/:type/:id/export
 */
export const exportFireflyItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { type, id } = req.params;
    const { mode = "raw" } = req.query;

    if (!isValidFireflyType(type)) {
      return res.status(400).json({ success: false, message: `Invalid type: ${type}` });
    }

    const item = await getItemById(type, id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    let exported;
    if (mode === "format" && item.format_data) exported = item.format_data;
    else if (item.raw_data) exported = item.raw_data;
    else exported = item;

    const safeName = (item.name || "item").replace(/\s+/g, "_");
    const safeMode = mode === "format" ? "format" : "raw";
    const filename = `${safeName}_${type}_${safeMode}.json`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(exported, null, 2));
  } catch (error) {
    console.error("❌ exportFireflyItem error:", error);
    return res.status(500).json({ success: false, message: "Failed to export item", error: error.message });
  }
};

/**
 * GET /api/firefly/types
 * Return daftar type yang diizinkan.
 */
export const getFireflyTypes = async (req, res) => {
  return res.status(200).json({ success: true, types: ALLOWED_TYPES });
};

// ==========================================
// HOMEBREW CONTROLLERS
// ==========================================

/**
 * POST /api/firefly/homebrew/import
 * Import homebrew items. Sama seperti import biasa tapi masuk ke tabel *_homebrew
 * dan otomatis catat di heralds_firefly.
 */
export const importHomebrewItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userName = req.user?.username || "Unknown";
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const body = req.body;
    let rawItems = [];

    if (Array.isArray(body)) rawItems = body;
    else if (body?.items && Array.isArray(body.items)) rawItems = body.items;
    else if (body && typeof body === "object") rawItems = [body];
    else return res.status(400).json({ success: false, message: "Invalid request body" });

    if (rawItems.length === 0) {
      return res.status(400).json({ success: false, message: "No items to import" });
    }

    // Reuse filterAndGroupItems — tapi hanya terima homebrew types
    const { grouped, rejected } = filterAndGroupItems(rawItems);

    let totalInserted = 0;
    const results = {};

    // Insert ke homebrew tables + catat di heralds_firefly
    if (grouped.weapon?.length) {
      const inserted = await bulkInsertHomebrewWeapons(grouped.weapon, userId, userName);
      results.weapon = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "weapons", entries);
    }
    if (grouped.consumable?.length) {
      const inserted = await bulkInsertHomebrewConsumables(grouped.consumable, userId, userName);
      results.consumable = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "consumables", entries);
    }
    if (grouped.container?.length) {
      const inserted = await bulkInsertHomebrewContainers(grouped.container, userId, userName);
      results.container = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "containers", entries);
    }
    if (grouped.equipment?.length) {
      const inserted = await bulkInsertHomebrewEquipments(grouped.equipment, userId, userName);
      results.equipment = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "equipments", entries);
    }
    if (grouped.loot?.length) {
      const inserted = await bulkInsertHomebrewLoots(grouped.loot, userId, userName);
      results.loot = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "loots", entries);
    }
    if (grouped.tool?.length) {
      const inserted = await bulkInsertHomebrewTools(grouped.tool, userId, userName);
      results.tool = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "tools", entries);
    }
    if (grouped.spell?.length) {
      const inserted = await bulkInsertHomebrewSpells(grouped.spell, userId, userName);
      results.spell = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "spells", entries);
    }
    if (grouped.feat?.length) {
      const inserted = await bulkInsertHomebrewFeats(grouped.feat, userId, userName);
      results.feat = inserted.length;
      totalInserted += inserted.length;
      const entries = inserted.map((i) => ({ id: i.id, name: i.name, image: i.image }));
      await appendToHeraldsFirefly(userId, "feats", entries);
    }

    return res.status(200).json({
      success: true,
      message: `Homebrew imported ${totalInserted} item(s) across ${Object.keys(results).length} type(s)`,
      imported: totalInserted,
      details: results,
      rejected: rejected.length,
      rejected_details: rejected,
      allowed_types: HOMEBREW_TYPES,
    });
  } catch (error) {
    console.error("❌ importHomebrewItems error:", error);
    return res.status(500).json({ success: false, message: "Failed to import homebrew items", error: error.message });
  }
};

/**
 * GET /api/firefly/homebrew/items
 * List homebrew items milik user. Query: ?type=weapon&search=sword&limit=50&offset=0
 */
export const listHomebrewItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { type, search, limit = 50, offset = 0 } = req.query;

    let items;
    if (type && isValidHomebrewType(type)) {
      items = await listHomebrewItemsByType(type, userId, { search, limit: Number(limit), offset: Number(offset) });
    } else {
      items = await listHomebrewAllTypes(userId, { search, limit: Number(limit) });
    }

    return res.status(200).json({ success: true, count: items.length, items });
  } catch (error) {
    console.error("❌ listHomebrewItems error:", error);
    return res.status(500).json({ success: false, message: "Failed to list homebrew items", error: error.message });
  }
};

/**
 * GET /api/firefly/homebrew/items/:type/:id
 */
export const getHomebrewItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { type, id } = req.params;
    if (!isValidHomebrewType(type)) {
      return res.status(400).json({ success: false, message: `Invalid homebrew type: ${type}` });
    }

    const item = await getHomebrewItemById(type, id, userId);
    if (!item) return res.status(404).json({ success: false, message: "Homebrew item not found" });

    return res.status(200).json({ success: true, item });
  } catch (error) {
    console.error("❌ getHomebrewItem error:", error);
    return res.status(500).json({ success: false, message: "Failed to get homebrew item", error: error.message });
  }
};

/**
 * POST /api/firefly/homebrew/delete
 * Body: { type: "weapon", ids: ["uuid1", "uuid2"] }
 * Hapus dari tabel homebrew + hapus dari heralds_firefly
 */
export const deleteHomebrewItems = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { type, ids } = req.body;

    if (!type || !isValidHomebrewType(type)) {
      return res.status(400).json({ success: false, message: "Valid homebrew type is required" });
    }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "ids must be a non-empty array" });
    }

    await deleteHomebrewItemsByIds(type, ids, userId);

    // Hapus juga dari heralds_firefly
    const column = TYPE_TO_FIREFLY_COLUMN[type];
    if (column) {
      await removeFromHeraldsFirefly(userId, column, ids);
    }

    return res.status(200).json({ success: true, message: `Deleted ${ids.length} homebrew ${type} item(s)` });
  } catch (error) {
    console.error("❌ deleteHomebrewItems error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete homebrew items", error: error.message });
  }
};

/**
 * GET /api/firefly/homebrew/collection
 * Get heralds_firefly data milik user (ringkasan semua homebrew items)
 */
export const getHomebrewCollection = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Access denied" });

    const { data, error } = await getHeraldsFireflyByUserId(userId);
    if (error && error.code === "PGRST116") {
      // Belum ada, return empty
      return res.status(200).json({
        success: true,
        collection: { weapons: [], spells: [], consumables: [], containers: [], equipments: [], feats: [], loots: [], tools: [] },
      });
    }
    if (error) throw error;

    return res.status(200).json({ success: true, collection: data });
  } catch (error) {
    console.error("❌ getHomebrewCollection error:", error);
    return res.status(500).json({ success: false, message: "Failed to get homebrew collection", error: error.message });
  }
};

/**
 * GET /api/firefly/homebrew/types
 */
export const getHomebrewTypes = async (req, res) => {
  return res.status(200).json({ success: true, types: HOMEBREW_TYPES });
};

/**
 * GET /api/firefly/admin/homebrew
 * Admin only: list ALL homebrew items dari semua user
 * Query: ?type=weapon&search=sword&limit=200&offset=0&user_id=xxx
 */
export const adminListAllHomebrew = async (req, res) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { type, search, limit = 200, offset = 0, user_id } = req.query;
    let items = await listAllHomebrewItems({ type, search, limit: Number(limit), offset: Number(offset) });

    // Filter by user_id if provided
    if (user_id) {
      items = items.filter((i) => i.user_id === user_id);
    }

    return res.status(200).json({ success: true, count: items.length, items });
  } catch (error) {
    console.error("❌ adminListAllHomebrew error:", error);
    return res.status(500).json({ success: false, message: "Failed to list all homebrew", error: error.message });
  }
};
