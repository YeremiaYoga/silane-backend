import { getIgniteCharactersByUserId } from "../models/igniteCharacterModel.js";

export const getIgniteCharacters = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }

    const { data, error } = await getIgniteCharactersByUserId(userId);
    if (error) throw error;

    res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    console.error("❌ getIgniteCharacters error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Ignite characters", error: error.message });
  }
};
