import supabase from "../utils/db.js";

export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, created_at")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw error;
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getGroupById:", err);
    return res.status(500).json({ success: false, message: "Failed to get group" });
  }
};

export const getGroupByShareCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, description, color, icon, share_code, members, resources, missions, max_members, creator_name, created_at")
      .eq("share_code", code)
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ success: false, message: "Group not found" });
      throw error;
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getGroupByShareCode:", err);
    return res.status(500).json({ success: false, message: "Failed to get group" });
  }
};
