import supabase from "../utils/db.js";

const SELECT_FIELDS = "id, user_id, title, subtitle, bg_image, bg_opacity, global_node_size, is_public, show_groups, characters, bestiary, items, relationships, groups, tags, share_id, created_at, updated_at";

export const saveRelationMap = async ({
  id,
  userId,
  share_id,
  title,
  subtitle,
  characters,
  bestiary,
  items,
  relationships,
  groups,
  tags,
  show_groups,
  bg_opacity,
  global_node_size,
  is_public,
  bg_image
}) => {
  const cleanTitle = (title || "Untitled Relation Map").trim();
  const cleanSubtitle = (subtitle || "").trim();
  const cleanShareId = (share_id || "").trim() || null;

  const cleanCharacters = Array.isArray(characters) ? characters : [];
  const cleanBestiary = Array.isArray(bestiary) ? bestiary : [];
  const cleanItems = Array.isArray(items) ? items : [];
  const cleanRelationships = Array.isArray(relationships) ? relationships : [];
  const cleanGroups = Array.isArray(groups) ? groups : [];
  const cleanTags = Array.isArray(tags) ? tags : [];
  const cleanIsPublic = typeof is_public === "boolean" ? is_public : Boolean(is_public);
  const cleanBgImage = (bg_image || "").trim();
  const cleanShowGroups = typeof show_groups === "boolean" ? show_groups : (show_groups === undefined ? true : Boolean(show_groups));
  const cleanBgOpacity = bg_opacity !== undefined && bg_opacity !== null ? Number(bg_opacity) : 15;
  const cleanGlobalNodeSize = global_node_size !== undefined && global_node_size !== null ? Number(global_node_size) : 44;

  if (id) {
    const { data: existing } = await supabase
      .from("relation_maps")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    if (existing) {
      const updatePayload = {
        title: cleanTitle,
        subtitle: cleanSubtitle,
        characters: cleanCharacters,
        bestiary: cleanBestiary,
        items: cleanItems,
        groups: cleanGroups,
        tags: cleanTags,
        relationships: cleanRelationships,
        is_public: cleanIsPublic,
        bg_image: cleanBgImage,
        bg_opacity: cleanBgOpacity,
        global_node_size: cleanGlobalNodeSize,
        show_groups: cleanShowGroups,
        updated_at: new Date().toISOString()
      };
      if (cleanShareId) {
        updatePayload.share_id = cleanShareId;
      }

      const { data, error } = await supabase
        .from("relation_maps")
        .update(updatePayload)
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
    bestiary: cleanBestiary,
    items: cleanItems,
    groups: cleanGroups,
    tags: cleanTags,
    relationships: cleanRelationships,
    is_public: cleanIsPublic,
    bg_image: cleanBgImage,
    bg_opacity: cleanBgOpacity,
    global_node_size: cleanGlobalNodeSize,
    show_groups: cleanShowGroups,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (cleanShareId) {
    insertPayload.share_id = cleanShareId;
  }

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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id).trim());

  let query = supabase
    .from("relation_maps")
    .select(SELECT_FIELDS);

  if (isUuid) {
    query = query.eq("id", id);
  } else {
    query = query.eq("share_id", id);
  }

  if (userId) {
    query = query.eq("user_id", String(userId));
  }

  let { data, error } = await query.maybeSingle();

  if (!data && isUuid) {
    let fallbackQuery = supabase
      .from("relation_maps")
      .select(SELECT_FIELDS)
      .eq("share_id", id);
    if (userId) fallbackQuery = fallbackQuery.eq("user_id", String(userId));
    const fallback = await fallbackQuery.maybeSingle();
    if (fallback.data) data = fallback.data;
  }

  if (error && !data) throw error;
  return data;
};

export const getRelationMapByShareId = async (shareId) => {
  const { data, error } = await supabase
    .from("relation_maps")
    .select(SELECT_FIELDS)
    .eq("share_id", String(shareId).trim())
    .maybeSingle();

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
