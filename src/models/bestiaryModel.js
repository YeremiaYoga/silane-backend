import supabase from "../utils/db.js";

function ensureHttps(urlStr) {
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

export async function listFoundryBestiary({ limit = 200, offset = 0, search = "", type = "" } = {}) {
  let query = supabase.from("foundry_bestiary").select("*", { count: "exact" });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  if (type) {
    query = query.ilike("creature_type", `%${type}%`);
  }

  query = query.range(offset, offset + limit - 1).order("name", { ascending: true });

  const { data, error, count } = await query;
  if (error) {
    console.error("Error listing foundry_bestiary:", error.message);
    return { items: [], total: 0 };
  }
  return { items: data || [], total: count || 0 };
}

export async function getFoundryBestiaryById(id) {
  const { data, error } = await supabase.from("foundry_bestiary").select("*").eq("id", id).maybeSingle();
  if (error) console.error("Error getFoundryBestiaryById:", error.message);
  return data;
}

function calculateProficiency(cr) {
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

export async function upsertFoundryBestiary(itemData) {
  const imgPort = ensureHttps(itemData.img_portrait || itemData.portraitUrl || itemData.image || null);
  const imgTok = ensureHttps(itemData.img_token || itemData.tokenUrl || null);
  const imgMain = ensureHttps(itemData.image || itemData.portraitUrl || itemData.img || imgPort);

  const rawData = itemData.raw_data ? JSON.parse(JSON.stringify(itemData.raw_data)) : {};
  if (imgPort) rawData.img = imgPort;
  if (imgTok) {
    if (!rawData.prototypeToken) rawData.prototypeToken = {};
    if (!rawData.prototypeToken.texture) rawData.prototypeToken.texture = {};
    rawData.prototypeToken.texture.src = imgTok;
  }

  const formatData = itemData.format_data && Object.keys(itemData.format_data).length > 0
    ? JSON.parse(JSON.stringify(itemData.format_data))
    : JSON.parse(JSON.stringify(rawData));

  if (imgPort) formatData.img = imgPort;
  if (imgTok) {
    if (!formatData.prototypeToken) formatData.prototypeToken = {};
    if (!formatData.prototypeToken.texture) formatData.prototypeToken.texture = {};
    formatData.prototypeToken.texture.src = imgTok;
  }
  if (!formatData.prototypeToken) formatData.prototypeToken = {};
  if (!formatData.prototypeToken.ring) formatData.prototypeToken.ring = { enabled: false };
  else if (typeof formatData.prototypeToken.ring === "object") formatData.prototypeToken.ring.enabled = false;

  const payload = {
    name: itemData.name,
    type: itemData.type || "npc",
    image: imgMain,
    img_portrait: imgPort,
    img_token: imgTok,
    cr: itemData.cr ?? 0,
    xp: itemData.xp ?? 0,
    size: itemData.size || null,
    creature_type: itemData.creature_type || itemData.type || null,
    subtype: itemData.subtype || null,
    alignment: itemData.alignment || null,
    ac: itemData.ac ?? 10,
    hp: itemData.hp || { value: 0, max: 0, temp: 0, formula: "" },
    speed: itemData.speed || { walk: 30 },
    abilities: itemData.abilities || {},
    skills: itemData.skills || [],
    senses: itemData.senses || [],
    damage_resistances: itemData.damage_resistances || [],
    damage_immunities: itemData.damage_immunities || [],
    damage_vulnerabilities: itemData.damage_vulnerabilities || [],
    condition_immunities: itemData.condition_immunities || [],
    languages: itemData.languages || [],
    features: itemData.features || formatData.features || [],
    actions: itemData.actions || formatData.actions || [],
    reactions: itemData.reactions || formatData.reactions || [],
    legendary_actions: itemData.legendary_actions || formatData.legendary_actions || [],
    spells: itemData.spells || formatData.spells || [],
    habitat: itemData.habitat || formatData.habitat || null,
    treasure: itemData.treasure || formatData.treasure || null,
    biography: itemData.biography || formatData.biography || null,
    public_biography: itemData.public_biography || formatData.public_biography || null,
    appearance: itemData.appearance || formatData.appearance || null,
    personality_traits: itemData.personality_traits || formatData.personality_traits || null,
    ideals: itemData.ideals || formatData.ideals || null,
    bonds: itemData.bonds || formatData.bonds || null,
    flaws: itemData.flaws || formatData.flaws || null,
    characteristics: itemData.characteristics || formatData.characteristics || {},
    source: itemData.source || formatData?.source || "SRD 5.2",
    fvtt_id: itemData.fvtt_id || itemData.id || null,
    raw_data: rawData,
    format_data: formatData,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from("foundry_bestiary").upsert(payload, { onConflict: "fvtt_id" }).select();
  if (error) throw new Error(error.message);
  return data ? data[0] : null;
}

export async function deleteFoundryBestiary(ids) {
  if (!ids || !ids.length) return true;
  const { error } = await supabase.from("foundry_bestiary").delete().in("id", ids);
  if (error) console.error("Error deleteFoundryBestiary:", error.message);
  return !error;
}

export async function listHomebrewBestiary({ userId, search = "", limit = 200, offset = 0 } = {}) {
  let query = supabase.from("bestiary_homebrew").select("*", { count: "exact" });
  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  query = query.range(offset, offset + limit - 1).order("name", { ascending: true });

  const { data, error, count } = await query;
  if (error) {
    let fbQuery = supabase.from("foundry_bestiary").select("*", { count: "exact" });
    if (search) fbQuery = fbQuery.ilike("name", `%${search}%`);
    fbQuery = fbQuery.range(offset, offset + limit - 1).order("name", { ascending: true });
    const { data: fbData, count: fbCount } = await fbQuery;
    return { items: fbData || [], total: fbCount || 0 };
  }
  return { items: data || [], total: count || 0 };
}

export async function getHomebrewBestiaryById(id, userId) {
  let { data } = await supabase.from("bestiary_homebrew").select("*").eq("id", id).maybeSingle();
  if (!data) {
    const res = await supabase.from("foundry_bestiary").select("*").eq("id", id).maybeSingle();
    data = res.data;
  }
  return data;
}

export async function upsertHomebrewBestiary(itemData) {
  const imgPort = ensureHttps(itemData.img_portrait || itemData.portraitUrl || itemData.image || null);
  const imgTok = ensureHttps(itemData.img_token || itemData.tokenUrl || null);
  const imgMain = ensureHttps(itemData.image || itemData.portraitUrl || itemData.img || imgPort);

  const rawData = itemData.raw_data ? JSON.parse(JSON.stringify(itemData.raw_data)) : {};
  if (imgPort) rawData.img = imgPort;
  if (imgTok) {
    if (!rawData.prototypeToken) rawData.prototypeToken = {};
    if (!rawData.prototypeToken.texture) rawData.prototypeToken.texture = {};
    rawData.prototypeToken.texture.src = imgTok;
  }

  const formatData = itemData.format_data && Object.keys(itemData.format_data).length > 0
    ? JSON.parse(JSON.stringify(itemData.format_data))
    : JSON.parse(JSON.stringify(rawData));

  if (imgPort) formatData.img = imgPort;
  if (imgTok) {
    if (!formatData.prototypeToken) formatData.prototypeToken = {};
    if (!formatData.prototypeToken.texture) formatData.prototypeToken.texture = {};
    formatData.prototypeToken.texture.src = imgTok;
  }
  if (!formatData.prototypeToken) formatData.prototypeToken = {};
  if (!formatData.prototypeToken.ring) formatData.prototypeToken.ring = { enabled: false };
  else if (typeof formatData.prototypeToken.ring === "object") formatData.prototypeToken.ring.enabled = false;

  const payload = {
    name: itemData.name,
    type: itemData.type || "npc",
    image: imgMain,
    img_portrait: imgPort,
    img_token: imgTok,
    cr: itemData.cr ?? 0,
    xp: itemData.xp ?? 0,
    size: itemData.size || null,
    creature_type: itemData.creature_type || itemData.type || null,
    subtype: itemData.subtype || null,
    alignment: itemData.alignment || null,
    ac: itemData.ac ?? 10,
    hp: itemData.hp || { value: 0, max: 0, temp: 0, formula: "" },
    speed: itemData.speed || { walk: 30 },
    abilities: itemData.abilities || {},
    skills: itemData.skills || [],
    senses: itemData.senses || [],
    damage_resistances: itemData.damage_resistances || [],
    damage_immunities: itemData.damage_immunities || [],
    damage_vulnerabilities: itemData.damage_vulnerabilities || [],
    condition_immunities: itemData.condition_immunities || [],
    languages: itemData.languages || [],
    features: itemData.features || formatData.features || [],
    actions: itemData.actions || formatData.actions || [],
    reactions: itemData.reactions || formatData.reactions || [],
    legendary_actions: itemData.legendary_actions || formatData.legendary_actions || [],
    spells: itemData.spells || formatData.spells || [],
    habitat: itemData.habitat || formatData.habitat || null,
    treasure: itemData.treasure || formatData.treasure || null,
    biography: itemData.biography || formatData.biography || null,
    public_biography: itemData.public_biography || formatData.public_biography || null,
    appearance: itemData.appearance || formatData.appearance || null,
    personality_traits: itemData.personality_traits || formatData.personality_traits || null,
    ideals: itemData.ideals || formatData.ideals || null,
    bonds: itemData.bonds || formatData.bonds || null,
    flaws: itemData.flaws || formatData.flaws || null,
    characteristics: itemData.characteristics || formatData.characteristics || {},
    source: itemData.source || formatData?.source || "Homebrew",
    fvtt_id: itemData.fvtt_id || itemData.id || null,
    user_id: itemData.user_id,
    user_name: itemData.user_name || "User",
    raw_data: rawData,
    format_data: formatData,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from("bestiary_homebrew").upsert(payload, { onConflict: "fvtt_id" }).select();
  if (error) {
    console.warn("bestiary_homebrew upsert error, falling back to foundry_bestiary:", error.message);
    const { user_id, user_name, ...foundryPayload } = payload;
    const { data: fbData, error: fbError } = await supabase.from("foundry_bestiary").upsert(foundryPayload, { onConflict: "fvtt_id" }).select();
    if (fbError) throw new Error(fbError.message);
    return fbData ? fbData[0] : null;
  }
  return data ? data[0] : null;
}

export async function deleteHomebrewBestiary(ids, userId) {
  if (!ids || !ids.length) return true;
  let query = supabase.from("bestiary_homebrew").delete().in("id", ids);
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
  if (error) {
    let fbQuery = supabase.from("foundry_bestiary").delete().in("id", ids);
    await fbQuery;
  }
  return true;
}
