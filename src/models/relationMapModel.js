import supabase from "../utils/db.js";

const SELECT_FIELDS = "id, user_id, title, subtitle, characters, is_public, bg_image, created_at, updated_at";

export const saveRelationMap = async ({ id, userId, title, subtitle, characters, is_public, bg_image }) => {
  const cleanTitle = (title || "Untitled Relation Map").trim();
  const cleanSubtitle = (subtitle || "").trim();

  const cleanCharacters = Array.isArray(characters)
    ? characters.map((c) => {
        const { groupId, groupIds, tagIds, ...rest } = c || {};
        return rest;
      })
    : [];
  const cleanIsPublic = typeof is_public === "boolean" ? is_public : Boolean(is_public);
  const cleanBgImage = (bg_image || "").trim();

  if (id) {
    const { data: existing } = await supabase
      .from("relation_maps")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (existing) {

      const { data, error } = await supabase
        .from("relation_maps")
        .update({
          title: cleanTitle,
          subtitle: cleanSubtitle,
          characters: cleanCharacters,
          is_public: cleanIsPublic,
          bg_image: cleanBgImage,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select(SELECT_FIELDS)
        .single();

      if (error) throw error;
      return data;
    }
  }

  const insertPayload = {
    user_id: String(userId),
    title: cleanTitle,
    subtitle: cleanSubtitle,
    characters: cleanCharacters,
    is_public: cleanIsPublic,
    bg_image: cleanBgImage,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (id) {
    insertPayload.id = id;
  }

  const { data, error } = await supabase
    .from("relation_maps")
    .insert([insertPayload])
    .select(SELECT_FIELDS)
    .single();

  if (error) throw error;
  return data;
};

export const getRelationMapsByUserId = async (userId) => {
  const { data, error } = await supabase
    .from("relation_maps")
    .select(SELECT_FIELDS)
    .eq("user_id", String(userId))
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getRelationMapById = async (id, userId = null) => {
  let query = supabase
    .from("relation_maps")
    .select(SELECT_FIELDS)
    .eq("id", id);

  if (userId) {
    query = query.eq("user_id", String(userId));
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
};

export const deleteRelationMapById = async (id, userId) => {
  const { data, error } = await supabase
    .from("relation_maps")
    .delete()
    .eq("id", id)
    .eq("user_id", String(userId))
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
};
