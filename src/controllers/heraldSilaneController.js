import crypto from "crypto";
import minioClient from "../utils/minio.js";
import {
  getHeraldSilaneByUserId,
  updateHeraldSilaneByUserId,
  createHeraldSilane,
} from "../models/heraldSilaneModel.js";

const bucketName = process.env.MINIO_BUCKET_NAME;

const generatePublicId = () => crypto.randomBytes(8).toString("hex");

export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diunggah" });
    }

    const userId = req.user?.id || req.body.user_id;
    const username = req.user?.username || req.body.username;
    const type = req.body.type;

    if (!userId || !username) {
      return res
        .status(401)
        .json({ message: "Akses ditolak: User tidak valid" });
    }
    if (!["image", "music"].includes(type)) {
      return res
        .status(400)
        .json({ message: 'Tipe file harus "image" atau "music"' });
    }

    let { data: userData, error: fetchError } =
      await getHeraldSilaneByUserId(userId);
    let publicId = userData?.public_id;

    if (fetchError && fetchError.code === "PGRST116") {
      publicId = generatePublicId();
      const newData = {
        user_id: userId,
        username: username,
        public_id: publicId,
        [type]: [],
      };
      userData = await createHeraldSilane(newData);
    } else if (!fetchError && !publicId) {
      publicId = generatePublicId();
      await updateHeraldSilaneByUserId(userId, { public_id: publicId });
      userData.public_id = publicId;
    } else if (fetchError) {
      throw fetchError;
    }

    const file = req.file;
    const safeOriginalName = file.originalname.replace(/\s+/g, "-");
    const fileName = `${Date.now()}-${safeOriginalName}`;
    const objectPath = `${publicId}/${type}/${fileName}`;

    await minioClient.putObject(
      bucketName,
      objectPath,
      file.buffer,
      file.size,
      {
        "Content-Type": file.mimetype,
      },
    );

    const newFileEntry = {
      name: safeOriginalName,
      path: objectPath,
      uploaded_at: new Date().toISOString(),
    };

    const currentFiles = userData[type] || [];
    currentFiles.push(newFileEntry);
    await updateHeraldSilaneByUserId(userId, { [type]: currentFiles });

    res.status(200).json({
      message: `Berhasil mengunggah ${type}`,
      file: newFileEntry,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Gagal mengunggah media", error: error.message });
  }
};

export const getDataSilane = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Tidak ada akses" });
    }

    const { data, error } = await getHeraldSilaneByUserId(userId);

    if (error && error.code === "PGRST116") {
      return res
        .status(404)
        .json({ message: "Data Herald Silane belum dibuat" });
    } else if (error) {
      throw error;
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Gagal mengambil data silane", error: error.message });
  }
};
