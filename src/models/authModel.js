import supabase from "../utils/db.js";

// Cari user hanya berdasarkan hash yang sudah dicocokkan
export const getUserByLoginHash = async (loginHash) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, email, profile_picture")
    .eq("fvtt_login_hash", loginHash)
    .maybeSingle();

  if (error) {
    console.error("❌ getUserByLoginHash error:", error.message);
    throw error;
  }

  return data; 
};