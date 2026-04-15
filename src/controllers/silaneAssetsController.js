import minioClient from "../utils/minio.js";
import sharp from "sharp";
import {
  getHeraldSilaneByUserId,
  updateHeraldSilaneByUserId,
  insertSilaneMedia,
  getSilaneMediaByIds,
  upsertSilaneVisage,
  getSilaneVisageByIds,
} from "../models/silaneAssetsModel.js";
import crypto from "crypto";
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
      return res.status(400).json({
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

export const uploadVisageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const userId = req.user?.id || req.body.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Access denied." });
    }

    let { data: userData, error: fetchError } =
      await getHeraldSilaneByUserId(userId);
    if (fetchError || !userData?.public_id) {
      return res
        .status(404)
        .json({ message: "Silane profile data not found." });
    }

    // Generate Nama File: Tanggal-Random (Tanpa tulisan 'visage-')
    const file = req.file;
    const dateStr = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${dateStr}-${randomStr}.webp`;

    // Path di dalam bucket (Folder User ID / Nama File)
    const objectPath = `${userData.public_id}/${fileName}`;

    const bufferToUpload = await sharp(file.buffer)
      .webp({ quality: 80 })
      .toBuffer();

    await minioClient.putObject(
      process.env.MINIO_BUCKET_NAME,
      objectPath,
      bufferToUpload,
      bufferToUpload.length,
      { "Content-Type": "image/webp" },
    );

    const fullUrl = `https://${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${objectPath}`;

    // Kembalikan Full URL ke frontend
    res.status(200).json({
      message: "Visage image uploaded successfully",
      url: fullUrl,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to upload visage image", error: error.message });
  }
};

export const updateVisageData = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { visage } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }

    if (!visage || !visage.items) {
      return res.status(400).json({ message: "No visage data provided" });
    }

    const items = visage.items;
    const folders = items.filter((item) => item.type === "folder");
    const profiles = items.filter((item) => item.type === "profile");

    // 1. Siapkan data MINIMAL untuk herald_silane (id, nama, image, parentId, type)
    const minimalProfiles = profiles.map((p) => ({
      id: p.id,
      type: "profile",
      parentId: p.parentId, // Wajib agar hirarki folder di frontend tidak rusak
      name: p.name,
      tokenUrl: p.tokenUrl,
      portraitUrl: p.portraitUrl,
    }));

    const heraldVisage = { items: [...folders, ...minimalProfiles] };

    const visageProfilesToUpsert = profiles.map((p) => ({
      id: p.id,
      user_id: userId, // <--- TAMBAHKAN INI
      folder_id: p.parentId,
      name: p.name,
      potrait_art: p.portraitUrl,
      token_art: p.tokenUrl,
      size: p.size ? parseFloat(p.size) : null,
      dimensions: {
        width: p.width ? parseFloat(p.width) : null,
        height: p.height ? parseFloat(p.height) : null,
      },
      hidden: p.hide || false,
      charaacter: p.charaacter || [],
    }));

    const updatedData = await updateHeraldSilaneByUserId(userId, {
      visage: heraldVisage,
    });

    if (visageProfilesToUpsert.length > 0) {
      const { error: upsertError } = await upsertSilaneVisage(
        visageProfilesToUpsert,
      );
      if (upsertError) throw upsertError;
    }


    const activeProfileIds = profiles.map((p) => p.id);

    const { error: cleanupError } = await deleteOrphanedVisageProfiles(
      userId,
      activeProfileIds,
    );
    if (cleanupError)
      console.error("Gagal membersihkan data yatim:", cleanupError);

    res.status(200).json({
      message: "Visage data successfully updated and synced",
      data: updatedData.visage,
    });
  } catch (error) {
    console.error("Error updating visage data:", error);
    res.status(500).json({
      message: "Failed to update visage data",
      error: error.message,
    });
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

    // Blok Proses URL Images Minio ...
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

    // BLOK BARU: Gabungkan kembali data profile dari silane_visage
    if (data.visage && data.visage.items) {
      const profileIds = data.visage.items
        .filter((i) => i.type === "profile")
        .map((i) => i.id);

      if (profileIds.length > 0) {
        const { data: fullProfiles, error: fetchErr } =
          await getSilaneVisageByIds(profileIds);

        if (!fetchErr && fullProfiles) {
          // Buat Map agar pencarian lebih cepat (O(1) lookup)
          const profilesMap = {};
          fullProfiles.forEach((p) => {
            profilesMap[p.id] = p;
          });

          // Petakan ulang (Merge) data herald dengan data lengkap silane_visage
          data.visage.items = data.visage.items.map((item) => {
            if (item.type === "profile" && profilesMap[item.id]) {
              const dbProf = profilesMap[item.id];
              return {
                ...item, // Ini sudah membawa id, name, type, parentId, tokenUrl, portraitUrl
                size: dbProf.size || "",
                hide: dbProf.hidden,
                width: dbProf.dimensions?.width || "",
                height: dbProf.dimensions?.height || "",
                charaacter: dbProf.charaacter || [],
              };
            }
            return item;
          });
        }
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

export const getStorageUsage = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }

    // 1. Ambil data utama dari herald_silane
    const { data: userData, error: fetchError } = await getHeraldSilaneByUserId(userId);

    if (fetchError || !userData) {
      return res.status(404).json({ message: "Silane Assets data not found" });
    }

    let objectPaths = []; // Array untuk menampung semua path file di MinIO

    // 2. Kumpulkan Path File dari Images
    if (userData.images && userData.images.length > 0) {
      const imageIds = userData.images.map((img) => img.id);
      const { data: mediaRecords } = await getSilaneMediaByIds("images", imageIds);
      if (mediaRecords) {
        mediaRecords.forEach(record => {
          if (record.link) objectPaths.push(record.link);
        });
      }
    }

    // 3. Kumpulkan Path File dari Audio
    if (userData.audio && userData.audio.length > 0) {
      const audioIds = userData.audio.map((aud) => aud.id);
      const { data: audioRecords } = await getSilaneMediaByIds("audio", audioIds);
      if (audioRecords) {
        audioRecords.forEach(record => {
          if (record.link) objectPaths.push(record.link);
        });
      }
    }

    // 4. Kumpulkan Path File dari Visage
    if (userData.visage && userData.visage.items) {
      const profileIds = userData.visage.items
        .filter((i) => i.type === "profile")
        .map((i) => i.id);

      if (profileIds.length > 0) {
        const { data: fullProfiles } = await getSilaneVisageByIds(profileIds);
        
        if (fullProfiles) {
          // Format Prefix URL Minio yang kita buat di uploadVisageImage
          const minioPrefix = `https://${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/`;
          
          fullProfiles.forEach((p) => {
            // Ekstrak path asli dari Full URL
            if (p.token_art && p.token_art.startsWith(minioPrefix)) {
              objectPaths.push(p.token_art.replace(minioPrefix, ""));
            }
            if (p.potrait_art && p.potrait_art.startsWith(minioPrefix)) {
              objectPaths.push(p.potrait_art.replace(minioPrefix, ""));
            }
          });
        }
      }
    }

    // 5. Hitung Total Size secara Paralel ke MinIO
    let totalSizeBytes = 0;
    
    // Menggunakan Promise.all agar pengecekan ke MinIO berjalan lebih cepat
    await Promise.all(
      objectPaths.map(async (path) => {
        try {
          // statObject mengembalikan info file termasuk ukurannya (size)
          const stat = await minioClient.statObject(bucketName, path);
          totalSizeBytes += stat.size;
        } catch (err) {
          // Abaikan jika file fisik sudah tidak ada di MinIO agar tidak membuat error aplikasi
          console.warn(`File not found in MinIO or error accessing: ${path}`);
        }
      })
    );

    // 6. Konversi ke Format yang mudah dibaca (Megabytes)
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

    res.status(200).json({
      message: "Storage usage calculated successfully",
      data: {
        total_files: objectPaths.length,
        total_bytes: totalSizeBytes,
        total_mb: parseFloat(totalSizeMB)
      }
    });

  } catch (error) {
    console.error("Error calculating storage usage:", error);
    res.status(500).json({ 
      message: "Failed to calculate storage usage", 
      error: error.message 
    });
  }
};