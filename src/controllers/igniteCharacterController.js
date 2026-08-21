import { getIgniteCharactersByUserId, getIgniteCharacterByCode } from "../models/igniteCharacterModel.js";

export const getIgniteCharacters = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }

    const { data, error } = await getIgniteCharactersByUserId(userId);
    if (error) throw error;

    const username = req.user?.username || null;
    res.status(200).json({ success: true, data: data || [], username });
  } catch (error) {
    console.error("❌ getIgniteCharacters error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch Ignite characters", error: error.message });
  }
};

export const getIgniteCharacterByCodeController = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    const { data, error } = await getIgniteCharacterByCode(code);
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: "Character not found with provided code" });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ getIgniteCharacterByCode error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch character by code", error: error.message });
  }
};
