import minioClient from "../utils/minio.js";
import sharp from "sharp";
import {
  getHeraldSilaneByUserId,
  updateHeraldSilaneByUserId,
  insertSilaneMedia,
  getSilaneMediaByIds,
} from "../models/silaneAssetsModel.js";

const bucketName = process.env.MINIO_BUCKET_NAME;

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const userId = req.user?.id || req.body.user_id;
    const type = req.body.type;
    const customName = req.body.customName;

    if (!userId) {
      return res.status(401).json({ message: "Access denied: Invalid user." });
    }

    if (type !== "images") {
      return res
        .status(400)
        .json({
          message: "Invalid file type. Currently only supports images.",
        });
    }

    let { data: userData, error: fetchError } =
      await getHeraldSilaneByUserId(userId);
    if (fetchError || !userData?.public_id) {
      return res
        .status(404)
        .json({ message: "Silane profile data not found." });
    }

    const file = req.file;
    const baseName = file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/\s+/g, "-");
    const fileName = `${Date.now()}-${baseName}.webp`;
    const objectPath = `${userData.public_id}/${fileName}`;
    const finalName = customName ? customName.trim() : baseName;

    const bufferToUpload = await sharp(file.buffer)
      .webp({ quality: 80 })
      .toBuffer();

    await minioClient.putObject(
      bucketName,
      objectPath,
      bufferToUpload,
      bufferToUpload.length,
      { "Content-Type": "image/webp" },
    );

    const { data: savedMediaData, error: mediaError } = await insertSilaneMedia(
      "images",
      {
        name: finalName,
        user_id: userId,
        link: objectPath,
      },
    );

    if (mediaError) throw mediaError;

    const currentFiles = userData.images || [];
    currentFiles.push({
      id: savedMediaData.uuid,
      name: savedMediaData.name,
    });

    await updateHeraldSilaneByUserId(userId, { images: currentFiles });

    res.status(200).json({
      message: "Image uploaded successfully",
      file: savedMediaData,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to upload media", error: error.message });
  }
};

export const getDataSilane = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }

    const { data, error } = await getHeraldSilaneByUserId(userId);

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ message: "Silane Assets data not found" });
    } else if (error) {
      throw error;
    }

    if (data.images && data.images.length > 0) {
      const imageIds = data.images.map((img) => img.id);
      const { data: mediaRecords, error: mediaErr } = await getSilaneMediaByIds(
        "images",
        imageIds,
      );

      if (!mediaErr && mediaRecords) {
        const urlMap = {};
        await Promise.all(
          mediaRecords.map(async (record) => {
            try {
              urlMap[record.uuid] = await minioClient.presignedGetObject(
                bucketName,
                record.link,
                24 * 60 * 60,
              );
            } catch (err) {
              console.error(err);
            }
          }),
        );

        data.images = data.images.map((img) => ({
          ...img,
          url: urlMap[img.id] || null,
        }));
      }
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to fetch Silane data", error: error.message });
  }
};

export const deleteMedia = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { ids, type } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }
    if (!ids || !Array.isArray(ids) || type !== "images") {
      return res
        .status(400)
        .json({ message: "Invalid data or type is not images" });
    }

    const { data: userData, error: fetchError } =
      await getHeraldSilaneByUserId(userId);
    if (fetchError) throw fetchError;

    const currentFiles = userData.images || [];
    const updatedFiles = currentFiles.filter((file) => !ids.includes(file.id));

    await updateHeraldSilaneByUserId(userId, { images: updatedFiles });

    res
      .status(200)
      .json({ message: `Successfully deleted ${ids.length} item(s)` });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete media", error: error.message });
  }
};
