import supabase from "../utils/db.js";

const isUuid = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const getIgniteCharactersByUserId = async (userId) => {
  return await supabase
    .from("characters")
    .select("id, private_id, public_id, name, full_name, art_image, token_image, created_at, species, classes, fvtt_format, npc_format, character_type")
    .eq("user_id", userId)
    .eq("record_status", "active")
    .order("created_at", { ascending: false });
};

export const getIgniteCharacterByCode = async (code) => {
  const cleanCode = String(code || "").trim();
  if (!cleanCode) {
    return { data: null, error: null };
  }

  const orCondition = isUuid(cleanCode)
    ? `id.eq.${cleanCode},private_id.eq.${cleanCode},public_id.eq.${cleanCode}`
    : `private_id.eq.${cleanCode},public_id.eq.${cleanCode}`;

  return await supabase
    .from("characters")
    .select("id, private_id, public_id, name, full_name, art_image, token_image, created_at, species, classes, fvtt_format, npc_format, character_type, user_id")
    .or(orCondition)
    .eq("record_status", "active")
    .maybeSingle();
};

