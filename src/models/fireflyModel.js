import supabase from "../utils/db.js";

const TABLES = [
  { key: "consumable", table: "foundry_consumables" },
  { key: "container", table: "foundry_containers" },
  { key: "equipment", table: "foundry_equipments" },
  { key: "feat", table: "foundry_feats" },
  { key: "feature", table: "foundry_features" },
  { key: "loot", table: "foundry_loots" },
  { key: "spell", table: "foundry_spells" },
  { key: "tool", table: "foundry_tools" },
  { key: "weapon", table: "foundry_weapons" },
];

const HOMEBREW_TABLES = [
  { key: "consumable", table: "consumables_homebrew" },
  { key: "container", table: "containers_homebrew" },
  { key: "equipment", table: "equipments_homebrew" },
  { key: "feat", table: "feats_homebrew" },
  { key: "loot", table: "loots_homebrew" },
  { key: "spell", table: "spells_homebrew" },
  { key: "tool", table: "tools_homebrew" },
  { key: "weapon", table: "weapons_homebrew" },
];
export const getHomebrewTableByType = (type) => {
  return HOMEBREW_TABLES.find((t) => t.key === String(type).toLowerCase()) || null;
};
export const getHomebrewValidTypes = () => HOMEBREW_TABLES.map((t) => t.key);
export const isValidHomebrewType = (type) => {
  return HOMEBREW_TABLES.some((t) => t.key === String(type).toLowerCase());
};
export const getValidTypes = () => TABLES.map((t) => t.key);
export const isValidFireflyType = (type) => {
  return TABLES.some((t) => t.key === String(type).toLowerCase());
};
export const getTableByType = (type) => {
  return TABLES.find((t) => t.key === String(type).toLowerCase()) || null;
};
export const getAllTables = () => TABLES;

export const bulkInsertWeapons = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "weapon",
    fvtt_id: it.fvtt_id ?? null,
    rarity: it.rarity ?? null,
    base_item: it.base_item ?? null,
    type_value: it.type_value ?? null,
    damage_type: it.damage_type ?? null,
    damage: it.damage ?? null,
    attunement: it.attunement ?? null,
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    mastery: it.mastery ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("foundry_weapons").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertWeapons error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertConsumables = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "consumable",
    type_value: it.type_value ?? null,
    subtype: it.subtype ?? null,
    weight: it.weight ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    attunement: it.attunement ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("foundry_consumables").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertConsumables error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertContainers = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "container",
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    rarity: it.rarity ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    attunement: it.attunement ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("foundry_containers").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertContainers error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertEquipments = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "equipment",
    type_value: it.type_value ?? null,
    base_item: it.base_item ?? null,
    weight: it.weight ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    attunement: it.attunement ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("foundry_equipments").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertEquipments error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertLoots = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "loot",
    type_value: it.type_value ?? null,
    base_item: it.base_item ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,
    weight: it.weight ?? null,
    image: it.image ?? null,
    price: it.price ?? null,
    compendium_source: it.compendium_source ?? null,
    source_book: it.source_book ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("foundry_loots").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertLoots error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertTools = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "tool",
    rarity: it.rarity ?? null,
    base_item: it.base_item ?? null,
    type_value: it.type_value ?? null,
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    attunement: it.attunement ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("foundry_tools").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertTools error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertSpells = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "spell",
    properties: it.properties ?? null,
    level: it.level ?? null,
    school: it.school ?? null,
    description: it.description ?? null,
    affects: it.affects ?? null,
    image: it.image ?? null,
    compendium_source: it.compendium_source ?? null,
    source_book: it.source_book ?? null,
    price: it.price ?? null,
    activation: it.activation ?? null,
    range: it.range ?? null,
    template: it.template ?? null,
    materials: it.materials ?? null,
    duration: it.duration ?? null,
    favorites: [],
    favorites_count: 0,
    ratings: [],
    ratings_score: "",
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
    classes: it.classes ?? [],
    damage_type: it.damage_type ?? [],
    subclasses: it.subclasses ?? [],
    species: it.species ?? [],
    subspecies: it.subspecies ?? [],
  }));
  const { data, error } = await supabase.from("foundry_spells").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertSpells error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertFeats = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "feat",
    feat_type: it.feat_type ?? null,
    prerequisites: it.prerequisites ?? {},
    description: it.description ?? null,
    source_book: it.source_book ?? null,
    compendium_source: it.compendium_source ?? null,
    favorites_count: 0,
    fvtt_id: it.fvtt_id ?? null,
    requirements: it.requirements ?? null,
    image: it.image ?? null,
    properties: it.properties ?? [],
    uses: it.uses ?? {},
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase
    .from("foundry_feats")
    .insert(mapped)
    .select();
  if (error) { console.error("❌ bulkInsertFeats error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertFeatures = async (items) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    name: it.name,
    type: it.type || "feature",
    image: it.image ?? null,
    description: it.description ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
    favorites: [],
    favorites_count: 0,
    prerequisites: it.prerequisites ?? {},
    properties: it.properties ?? [],
    requirements: it.requirements ?? null,
    uses: it.uses ?? {},
  }));
  const { data, error } = await supabase.from("foundry_features").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertFeatures error:", error.message); throw error; }
  return data || [];
};

export const listItemsByType = async (type, { search, limit = 50, offset = 0 } = {}) => {
  const tableInfo = getTableByType(type);
  if (!tableInfo) throw new Error(`Invalid type: ${type}`);
  let query = supabase
    .from(tableInfo.table)
    .select("*")
    .order("created_at", { ascending: false });
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) { console.error(`❌ listItemsByType (${tableInfo.table}) error:`, error.message); throw error; }
  return data || [];
};
export const listItemsAllTypes = async ({ search, limit = 100 } = {}) => {
  let allItems = [];
  for (const t of TABLES) {
    let query = supabase.from(t.table).select("*");
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) { console.error(`❌ listItemsAllTypes (${t.table}) error:`, error.message); continue; }
    const mapped = (data || []).map((row) => ({ ...row, __type: t.key, __table: t.table }));
    allItems = allItems.concat(mapped);
  }
  allItems.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (limit) allItems = allItems.slice(0, Number(limit));
  return allItems;
};
export const getItemById = async (type, id) => {
  const tableInfo = getTableByType(type);
  if (!tableInfo) throw new Error(`Invalid type: ${type}`);
  const { data, error } = await supabase.from(tableInfo.table).select("*").eq("id", id).single();
  if (error) { console.error(`❌ getItemById (${tableInfo.table}) error:`, error.message); throw error; }
  return data;
};
export const deleteItemsByIds = async (type, ids) => {
  const tableInfo = getTableByType(type);
  if (!tableInfo) throw new Error(`Invalid type: ${type}`);
  const { error } = await supabase.from(tableInfo.table).delete().in("id", ids);
  if (error) { console.error(`❌ deleteItemsByIds (${tableInfo.table}) error:`, error.message); throw error; }
  return true;
};

export const bulkInsertHomebrewWeapons = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "weapon",
    fvtt_id: it.fvtt_id ?? null,
    rarity: it.rarity ?? null,
    base_item: it.base_item ?? null,
    type_value: it.type_value ?? null,
    damage_type: it.damage_type ?? null,
    damage: it.damage ?? null,
    attunement: it.attunement ?? null,
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    mastery: it.mastery ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("weapons_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewWeapons error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertHomebrewConsumables = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "consumable",
    type_value: it.type_value ?? null,
    subtype: it.subtype ?? null,
    weight: it.weight ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    attunement: it.attunement ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("consumables_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewConsumables error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertHomebrewContainers = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "container",
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    rarity: it.rarity ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    attunement: it.attunement ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("containers_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewContainers error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertHomebrewEquipments = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "equipment",
    type_value: it.type_value ?? null,
    base_item: it.base_item ?? null,
    weight: it.weight ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    attunement: it.attunement ?? null,
    image: it.image ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("equipments_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewEquipments error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertHomebrewLoots = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "loot",
    type_value: it.type_value ?? null,
    base_item: it.base_item ?? null,
    properties: it.properties ?? null,
    rarity: it.rarity ?? null,
    weight: it.weight ?? null,
    image: it.image ?? null,
    price: it.price ?? null,
    compendium_source: it.compendium_source ?? null,
    source_book: it.source_book ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("loots_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewLoots error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertHomebrewTools = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "tool",
    rarity: it.rarity ?? null,
    base_item: it.base_item ?? null,
    type_value: it.type_value ?? null,
    properties: it.properties ?? null,
    weight: it.weight ?? null,
    attunement: it.attunement ?? null,
    compendium_source: it.compendium_source ?? null,
    price: it.price ?? null,
    source_book: it.source_book ?? null,
    image: it.image ?? null,
    mastery: it.mastery ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("tools_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewTools error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertHomebrewSpells = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "spell",
    properties: it.properties ?? null,
    level: it.level ?? null,
    school: it.school ?? null,
    description: it.description ?? null,
    affects: it.affects ?? null,
    image: it.image ?? null,
    compendium_source: it.compendium_source ?? null,
    source_book: it.source_book ?? null,
    price: it.price ?? null,
    activation: it.activation ?? null,
    range: it.range ?? null,
    template: it.template ?? null,
    materials: it.materials ?? null,
    duration: it.duration ?? null,
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
    classes: it.classes ?? [],
    damage_type: it.damage_type ?? [],
    subclasses: it.subclasses ?? [],
    species: it.species ?? [],
    subspecies: it.subspecies ?? [],
  }));
  const { data, error } = await supabase.from("spells_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewSpells error:", error.message); throw error; }
  return data || [];
};
export const bulkInsertHomebrewFeats = async (items, userId, userName) => {
  if (!items?.length) return [];
  const mapped = items.map((it) => ({
    user_id: userId,
    user_name: userName,
    name: it.name,
    type: it.type || "feat",
    feat_type: it.feat_type ?? null,
    prerequisites: it.prerequisites ?? {},
    description: it.description ?? null,
    source_book: it.source_book ?? null,
    compendium_source: it.compendium_source ?? null,
    favorites_count: 0,
    fvtt_id: it.fvtt_id ?? null,
    requirements: it.requirements ?? null,
    image: it.image ?? null,
    properties: it.properties ?? [],
    uses: it.uses ?? {},
    raw_data: it.raw_data ?? {},
    format_data: it.format_data ?? {},
  }));
  const { data, error } = await supabase.from("feats_homebrew").insert(mapped).select();
  if (error) { console.error("❌ bulkInsertHomebrewFeats error:", error.message); throw error; }
  return data || [];
};

export const listHomebrewItemsByType = async (type, userId, { search, limit = 50, offset = 0 } = {}) => {
  const tableInfo = getHomebrewTableByType(type);
  if (!tableInfo) throw new Error(`Invalid homebrew type: ${type}`);
  let query = supabase
    .from(tableInfo.table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (search) query = query.ilike("name", `%${search}%`);
  query = query.range(offset, offset + limit - 1);
  const { data, error } = await query;
  if (error) { console.error(`❌ listHomebrewItemsByType (${tableInfo.table}) error:`, error.message); throw error; }
  return data || [];
};
export const listHomebrewAllTypes = async (userId, { search, limit = 100 } = {}) => {
  let allItems = [];
  for (const t of HOMEBREW_TABLES) {
    let query = supabase.from(t.table).select("*").eq("user_id", userId);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) { console.error(`❌ listHomebrewAllTypes (${t.table}) error:`, error.message); continue; }
    const mapped = (data || []).map((row) => ({ ...row, __type: t.key, __table: t.table }));
    allItems = allItems.concat(mapped);
  }
  allItems.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (limit) allItems = allItems.slice(0, Number(limit));
  return allItems;
};
export const listAllHomebrewItems = async ({ search, limit = 200, offset = 0, type } = {}) => {
  if (type) {
    const tableInfo = getHomebrewTableByType(type);
    if (!tableInfo) throw new Error(`Invalid homebrew type: ${type}`);
    let query = supabase.from(tableInfo.table).select("*").order("created_at", { ascending: false });
    if (search) query = query.ilike("name", `%${search}%`);
    query = query.range(offset, offset + limit - 1);
    const { data, error } = await query;
    if (error) { console.error(`❌ listAllHomebrewItems (${tableInfo.table}) error:`, error.message); throw error; }
    return (data || []).map((row) => ({ ...row, __type: type, __table: tableInfo.table }));
  }
  let allItems = [];
  for (const t of HOMEBREW_TABLES) {
    let query = supabase.from(t.table).select("*");
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) { console.error(`❌ listAllHomebrewItems (${t.table}) error:`, error.message); continue; }
    const mapped = (data || []).map((row) => ({ ...row, __type: t.key, __table: t.table }));
    allItems = allItems.concat(mapped);
  }
  allItems.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  if (limit) allItems = allItems.slice(0, Number(limit));
  return allItems;
};
export const getHomebrewItemById = async (type, id, userId) => {
  const tableInfo = getHomebrewTableByType(type);
  if (!tableInfo) throw new Error(`Invalid homebrew type: ${type}`);
  const { data, error } = await supabase.from(tableInfo.table).select("*").eq("id", id).eq("user_id", userId).single();
  if (error) { console.error(`❌ getHomebrewItemById (${tableInfo.table}) error:`, error.message); throw error; }
  return data;
};
export const deleteHomebrewItemsByIds = async (type, ids, userId) => {
  const tableInfo = getHomebrewTableByType(type);
  if (!tableInfo) throw new Error(`Invalid homebrew type: ${type}`);
  const { error } = await supabase.from(tableInfo.table).delete().in("id", ids).eq("user_id", userId);
  if (error) { console.error(`❌ deleteHomebrewItemsByIds (${tableInfo.table}) error:`, error.message); throw error; }
  return true;
};

export const getHeraldsFireflyByUserId = async (userId) => {
  return await supabase
    .from("heralds_firefly")
    .select("*")
    .eq("user_id", userId)
    .single();
};
export const createHeraldsFirefly = async (data) => {
  return await supabase
    .from("heralds_firefly")
    .insert([data])
    .select("*")
    .single();
};
export const updateHeraldsFireflyByUserId = async (userId, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updated_at: new Date().toISOString(),
  };
  return await supabase
    .from("heralds_firefly")
    .update(dataToUpdate)
    .eq("user_id", userId)
    .select("*")
    .single();
};
export const appendToHeraldsFirefly = async (userId, column, newEntries) => {
  const { data: existing, error: fetchErr } = await getHeraldsFireflyByUserId(userId);
  if (fetchErr && fetchErr.code === "PGRST116") {
    const newRow = {
      user_id: userId,
      user_name: userId,
      weapons: [],
      spells: [],
      consumables: [],
      containers: [],
      equipments: [],
      feats: [],
      loots: [],
      tools: [],
      [column]: newEntries,
    };
    const { data, error } = await supabase
      .from("heralds_firefly")
      .insert([newRow])
      .select("*")
      .single();
    if (error) { console.error(`❌ appendToHeraldsFirefly create error:`, error.message); throw error; }
    return data;
  }
  if (fetchErr) throw fetchErr;
  const currentArray = existing?.[column] || [];
  const merged = [...currentArray, ...newEntries];
  const { data, error } = await supabase
    .from("heralds_firefly")
    .update({ [column]: merged, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) { console.error(`❌ appendToHeraldsFirefly (${column}) error:`, error.message); throw error; }
  return data;
};
export const removeFromHeraldsFirefly = async (userId, column, idsToRemove) => {
  const { data: existing, error: fetchErr } = await getHeraldsFireflyByUserId(userId);
  if (fetchErr) throw fetchErr;
  const currentArray = existing?.[column] || [];
  const filtered = currentArray.filter((entry) => !idsToRemove.includes(entry.id));
  const { data, error } = await supabase
    .from("heralds_firefly")
    .update({ [column]: filtered, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) { console.error(`❌ removeFromHeraldsFirefly (${column}) error:`, error.message); throw error; }
  return data;
};
