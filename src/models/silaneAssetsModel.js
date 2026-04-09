import supabase from "../utils/db.js";

export const getAllHeraldSilanes = async () => {
  return await supabase
    .from("herald_silane")
    .select("*")
    .order("created_at", { ascending: false });
};

export const getHeraldSilaneById = async (id) => {
  return await supabase
    .from("herald_silane")
    .select("*")
    .eq("id", id)
    .single();
};

export const getHeraldSilaneByUserId = async (userId) => {
  return await supabase
    .from("herald_silane")
    .select("*")
    .eq("user_id", userId)
    .single();
};

export const createHeraldSilane = async (data) => {
  return await supabase
    .from("herald_silane")
    .insert([data])
    .select("*")
    .single();
};

export const updateHeraldSilane = async (id, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  return await supabase
    .from("herald_silane")
    .update(dataToUpdate)
    .eq("id", id)
    .select("*")
    .single();
};

export const updateHeraldSilaneByUserId = async (userId, updateData) => {
  const dataToUpdate = {
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  return await supabase
    .from("herald_silane")
    .update(dataToUpdate)
    .eq("user_id", userId)
    .select("*")
    .single();
};

export const deleteHeraldSilane = async (id) => {
  return await supabase
    .from("herald_silane")
    .delete()
    .eq("id", id);
};

export const insertSilaneMedia = async (type, data) => {
  const tableName = type === "images" ? "silane_image" : `silane_${type}`;
  return await supabase
    .from(tableName)
    .insert([data])
    .select("*")
    .single();
};

export const getSilaneMediaByIds = async (type, ids) => {
  const tableName = type === "images" ? "silane_image" : `silane_${type}`;
  return await supabase
    .from(tableName)
    .select("uuid, link")
    .in("uuid", ids);
};