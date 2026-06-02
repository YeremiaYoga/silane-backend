import supabase from "../utils/db.js";

export const getUserByLoginHash = async (loginHash) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, email, profile_picture, limits, silane_id") 
    .eq("fvtt_login_hash", loginHash)
    .maybeSingle();

  if (error) {
    console.error("❌ getUserByLoginHash error:", error.message);
    throw error;
  }

  return data; 
};

export const getUserBySilaneId = async (silaneId) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, email, profile_picture, limits, silane_id") 
    .eq("silane_id", silaneId)
    .maybeSingle();

  if (error) {
    console.error("❌ getUserBySilaneId error:", error.message);
    throw error;
  }

  return data; 
};