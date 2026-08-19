import supabase from "../utils/db.js";

export const getIgniteCharactersByUserId = async (userId) => {
  return await supabase
    .from("characters")
    .select("id, name, full_name, art_image, token_image, created_at, species, classes, fvtt_format, npc_format, character_type")
    .eq("user_id", userId)
    .eq("record_status", "active")
    .order("created_at", { ascending: false });
};
