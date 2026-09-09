import {
  saveRelationMap as saveRelationMapModel,
  getRelationMapsByUserId,
  getRelationMapById as getRelationMapByIdModel,
  deleteRelationMapById
} from "../models/relationMapModel.js";

export const saveRelationMap = async (req, res) => {
  try {
    const userId = req.user?.id || req.body?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Silakan login terlebih dahulu untuk menyimpan Relation Map."
      });
    }

    const { id, title, subtitle, characters, is_public, bg_image } = req.body;

    const data = await saveRelationMapModel({
      id: id || undefined,
      userId,
      title,
      subtitle,
      characters,
      is_public,
      bg_image
    });

    return res.status(200).json({
      success: true,
      message: "Relation Map berhasil disimpan ke database.",
      data
    });
  } catch (error) {
    console.error("❌ saveRelationMap error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan Relation Map ke database.",
      error: error.message
    });
  }
};

export const getUserRelationMaps = async (req, res) => {
  try {
    const userId = req.user?.id || req.query?.user_id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const data = await getRelationMapsByUserId(userId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error("❌ getUserRelationMaps error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar Relation Map.",
      error: error.message
    });
  }
};

export const getRelationMapById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const data = await getRelationMapByIdModel(id, userId);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Relation Map tidak ditemukan."
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error("❌ getRelationMapById error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data Relation Map.",
      error: error.message
    });
  }
};

export const deleteRelationMap = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const data = await deleteRelationMapById(id, userId);
    return res.status(200).json({
      success: true,
      message: "Relation Map berhasil dihapus.",
      data
    });
  } catch (error) {
    console.error("❌ deleteRelationMap error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus Relation Map.",
      error: error.message
    });
  }
};
