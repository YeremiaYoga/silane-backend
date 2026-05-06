import crypto from "crypto";
import {
  uploadAssetToR2,
  getFileSizeFromR2,
  deleteAssetFromR2,
} from "../utils/r2.js";

import {
  getHeraldSilaneByUserId,
  updateHeraldSilaneByUserId,
  insertSilaneMedia,
  getSilaneMediaByIds,
  upsertSilaneVisage,
  getSilaneVisageByIds,
  deleteOrphanedVisageProfiles,
  deleteSilaneMediaByIds,
  upsertSilaneCharacter,
  getSilaneCharacterByIds,
  deleteOrphanedCharacterProfiles,
  getAllHeraldSilanes,
  getSilanePlaylistsByAlbumIds,
  upsertSilanePlaylists,
  deleteOrphanedPlaylists,
  createHeraldSilane,
  getAllHeraldSilaneAudio, 
} from "../models/silaneAssetsModel.js";

const generateRandomFileName = (originalName) => {
  const ext = originalName.includes(".")
    ? originalName.substring(originalName.lastIndexOf("."))
    : "";
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = crypto.randomBytes(8).toString("hex");
  return `${dateStr}-${randomStr}${ext}`;
};

const generatePublicId = () => crypto.randomBytes(8).toString("hex");


const safeJsonParse = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "object") return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return fallback;
  }
};

// ==========================================
// MEDIA (IMAGES)
// ==========================================
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const userId = req.user?.id || req.body.user_id;
    const type = req.body.type;
    const customName = req.body.customName;

    let tagsArray = [];
    if (req.body.tags) {
      try {
        tagsArray = JSON.parse(req.body.tags);
      } catch (e) {
        console.warn("Failed to parse tags:", e.message);
      }
    }

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

    const randomFileName = generateRandomFileName(req.file.originalname);
    req.file.originalname = randomFileName;

    const finalName = customName
      ? customName.trim()
      : randomFileName.replace(/\.[^/.]+$/, "");

    let publicUrl;
    try {
      publicUrl = await uploadAssetToR2({
        file: req.file,
        folderName: userData.public_id,
      });
    } catch (uploadErr) {
      return res
        .status(400)
        .json({ message: uploadErr.message || "Upload failed." });
    }

    const { data: savedMediaData, error: mediaError } = await insertSilaneMedia(
      "images",
      {
        name: finalName,
        user_id: userId,
        link: publicUrl,
      },
    );

    if (mediaError) throw mediaError;

    const currentFiles = userData.images || [];

    currentFiles.push({
      id: savedMediaData.uuid,
      name: savedMediaData.name,
      tags: tagsArray,
    });

    await updateHeraldSilaneByUserId(userId, { images: currentFiles });

    res.status(200).json({
      message: "Image uploaded successfully",
      file: {
        ...savedMediaData,
        tags: tagsArray,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message || "Failed to upload media",
    });
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

    const { data: mediaRecords, error: mediaErr } = await getSilaneMediaByIds(
      type,
      ids,
    );
    if (mediaErr) throw mediaErr;

    if (mediaRecords && mediaRecords.length > 0) {
      await Promise.all(
        mediaRecords.map(async (record) => {
          if (record.link) {
            await deleteAssetFromR2(record.link);
          }
        }),
      );
    }

    const { error: deleteDbErr } = await deleteSilaneMediaByIds(type, ids);
    if (deleteDbErr) throw deleteDbErr;

    const { data: userData, error: fetchError } =
      await getHeraldSilaneByUserId(userId);
    if (fetchError) throw fetchError;

    const currentFiles = userData.images || [];
    const updatedFiles = currentFiles.filter((file) => !ids.includes(file.id));

    await updateHeraldSilaneByUserId(userId, { images: updatedFiles });

    res.status(200).json({
      message: `Successfully deleted ${ids.length} item(s) and cleaned up R2 storage`,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete media", error: error.message });
  }
};

// ==========================================
// VISAGE
// ==========================================
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

    req.file.originalname = generateRandomFileName(req.file.originalname);

    let fullUrl;
    try {
      fullUrl = await uploadAssetToR2({
        file: req.file,
        folderName: userData.public_id,
      });
    } catch (uploadErr) {
      return res
        .status(400)
        .json({ message: uploadErr.message || "Upload failed." });
    }

    res.status(200).json({
      message: "Visage image uploaded successfully",
      url: fullUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message || "Failed to upload visage image",
    });
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

    const minimalProfiles = profiles.map((p) => ({
      id: p.id,
      type: "profile",
      parentId: p.parentId,
      name: p.name,
      tokenUrl: p.tokenUrl,
      portraitUrl: p.portraitUrl,
    }));

    const heraldVisage = { items: [...folders, ...minimalProfiles] };

    const visageProfilesToUpsert = profiles.map((p) => ({
      id: p.id,
      user_id: userId,
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
    if (cleanupError) console.error(cleanupError);

    res.status(200).json({
      message: "Visage data successfully updated and synced",
      data: updatedData.visage,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: error.message || "Failed to update visage data",
    });
  }
};

// ==========================================
// CHARACTER
// ==========================================
export const updateCharacterData = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { character } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }

    if (!character || !character.items) {
      return res.status(400).json({ message: "No character data provided" });
    }

    const items = character.items;
    const folders = items.filter((item) => item.type === "folder");
    const profiles = items.filter((item) => item.type === "character");

    const minimalProfiles = profiles.map((p) => ({
      id: p.id,
      type: "character",
      parentId: p.parentId,
      name: p.name,
    }));

    const heraldCharacter = { items: [...folders, ...minimalProfiles] };

    const characterProfilesToUpsert = profiles.map((p) => {
      const fvtt = p.fvtt_data || {};
      fvtt.name = p.name;
      const stats = fvtt._stats || {};
      const exportSource = stats.exportSource || {};

      const mergedMetadata = {
        ...(p.metadata || {}),
        system:
          stats.systemId || exportSource.systemId || fvtt.system?.id || null,
        systemVersion:
          stats.systemVersion || exportSource.systemVersion || null,
        core_version: stats.coreVersion || exportSource.coreVersion || null,
      };

      const tokenImage =
        p.tokenUrl || fvtt.img || fvtt.prototypeToken?.texture?.src || null;

      const worldId = p.world_id || exportSource.worldId || null;

      let exportTime = p.export_time
        ? new Date(p.export_time).toISOString()
        : new Date().toISOString();

      return {
        id: p.id,
        user_id: userId,
        folder_id: p.parentId,
        name: p.name,
        token_image: tokenImage,
        export_time: exportTime,
        world_id: worldId,
        fvtt_data: fvtt,
        metadata: mergedMetadata,
      };
    });

    const updatedData = await updateHeraldSilaneByUserId(userId, {
      character: heraldCharacter,
    });

    if (characterProfilesToUpsert.length > 0) {
      const { error: upsertError } = await upsertSilaneCharacter(
        characterProfilesToUpsert,
      );
      if (upsertError) throw upsertError;
    }

    const activeProfileIds = profiles.map((p) => p.id);
    const { error: cleanupError } = await deleteOrphanedCharacterProfiles(
      userId,
      activeProfileIds,
    );
    if (cleanupError) console.error(cleanupError);

    res.status(200).json({
      message: "Character data successfully updated and synced",
      data: updatedData.character,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update character data",
      error: error.message,
    });
  }
};

// ==========================================
// GET MASTER DATA (INCLUDES AUDIO)
// ==========================================
export const getDataSilane = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Access denied" });

    const { data, error } = await getHeraldSilaneByUserId(userId);

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ message: "Silane Assets data not found" });
    } else if (error) {
      throw error;
    }

    let domain = process.env.SILANE_PUBLIC_DOMAIN || "";
    domain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

    const formatUrl = (link) => {
      if (!link) return null;
      if (link.startsWith("http")) return link;
      let path = link.replace(/^\//, "");
      if (domain && path.startsWith(domain)) {
        return `https://${path}`;
      }
      return `https://${domain}/${path}`;
    };

    // Images
    if (data.images && data.images.length > 0) {
      const imageIds = data.images.map((img) => img.id);
      const { data: mediaRecords, error: mediaErr } = await getSilaneMediaByIds(
        "images",
        imageIds,
      );

      if (!mediaErr && mediaRecords) {
        const urlMap = {};
        mediaRecords.forEach((record) => {
          urlMap[record.uuid] = formatUrl(record.link);
        });

        data.images = data.images.map((img) => ({
          ...img,
          url: urlMap[img.id] || null,
        }));
      }
    }

    if (data.visage && data.visage.items) {
      const profileIds = data.visage.items
        .filter((i) => i.type === "profile")
        .map((i) => i.id);

      if (profileIds.length > 0) {
        const { data: fullProfiles, error: fetchErr } =
          await getSilaneVisageByIds(profileIds);

        if (!fetchErr && fullProfiles) {
          const profilesMap = {};
          fullProfiles.forEach((p) => {
            profilesMap[p.id] = p;
          });

          data.visage.items = data.visage.items.map((item) => {
            if (item.type === "profile") {
              const dbProf = profilesMap[item.id];
              if (dbProf) {
                return {
                  ...item,
                  size: dbProf.size || "",
                  hide: dbProf.hidden,
                  width: dbProf.dimensions?.width || "",
                  height: dbProf.dimensions?.height || "",
                  charaacter: dbProf.charaacter || [],
                  tokenUrl: formatUrl(dbProf.token_art || item.tokenUrl),
                  portraitUrl: formatUrl(
                    dbProf.potrait_art || item.portraitUrl,
                  ),
                };
              } else {
                return {
                  ...item,
                  tokenUrl: formatUrl(item.tokenUrl),
                  portraitUrl: formatUrl(item.portraitUrl),
                };
              }
            }
            return item;
          });
        }
      }
    }


    if (data.character && data.character.items) {
      const charProfileIds = data.character.items
        .filter((i) => i.type === "character")
        .map((i) => i.id);

      if (charProfileIds.length > 0) {
        const { data: fullChars, error: fetchCharErr } =
          await getSilaneCharacterByIds(charProfileIds);

        if (!fetchCharErr && fullChars) {
          const charMap = {};
          fullChars.forEach((c) => {
            charMap[c.id] = c;
          });

          data.character.items = data.character.items.map((item) => {
            if (item.type === "character") {
              const dbChar = charMap[item.id];
              if (dbChar) {
                return {
                  ...item,
                  tokenUrl: dbChar.token_image,
                  fvtt_data: dbChar.fvtt_data,
                  export_time: dbChar.export_time,
                  world_id: dbChar.world_id,
                  metadata: dbChar.metadata,
                };
              }
            }
            return item;
          });
        }
      }
    }


    let audioData = { albums: [], playlists: [] };
    let allAlbums = [];

    const { data: allProfiles } = await getAllHeraldSilaneAudio();

    if (allProfiles) {
      allProfiles.forEach((p) => {
        const pAudio = safeJsonParse(p.audio, {});

        if (pAudio.albums && Array.isArray(pAudio.albums)) {
          pAudio.albums.forEach((album) => {
            const isOwner = String(album.user_id) === String(userId);
            const isMember =
              album.joined_user &&
              album.joined_user.some(
                (u) => String(u.user_id) === String(userId),
              );

            if (isOwner || isMember) {
              if (!allAlbums.find((existing) => existing.id === album.id)) {
                allAlbums.push(album);
              }
            }
          });
        }
      });
    }

    const activeAlbumIds = allAlbums.map((a) => a.id);
    if (activeAlbumIds.length > 0) {
      try {
        const { data: playlists } =
          await getSilanePlaylistsByAlbumIds(activeAlbumIds);
        audioData.albums = allAlbums;
        audioData.playlists = (playlists || []).map((pl) => ({
          ...pl,
          track: pl.track || [],
        }));
      } catch (err) {
        console.error("Playlist Fetch Error:", err);
        audioData.albums = allAlbums;
      }
    } else {
      audioData.albums = allAlbums;
    }

    data.audio = audioData;
    res.status(200).json({ data });
  } catch (error) {
    console.error("GET DATA SILANE ERROR:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch Silane data", error: error.message });
  }
};

// ==========================================
// STORAGE USAGE
// ==========================================
export const getStorageUsage = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Access denied" });
    }

    const { data: userData, error: fetchError } =
      await getHeraldSilaneByUserId(userId);

    if (fetchError || !userData) {
      return res.status(404).json({ message: "Silane Assets data not found" });
    }

    let objectPaths = [];
    let totalSizeBytes = 0;

    let domain = process.env.SILANE_PUBLIC_DOMAIN || "";
    domain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

    const extractKey = (link) => {
      if (!link) return null;
      let path = link.replace(/^https?:\/\//, "");
      if (domain && path.startsWith(domain)) {
        path = path.substring(domain.length);
      }
      return path.replace(/^\//, "");
    };

    // Images
    if (userData.images && userData.images.length > 0) {
      const imageIds = userData.images.map((img) => img.id);
      const { data: mediaRecords } = await getSilaneMediaByIds(
        "images",
        imageIds,
      );
      if (mediaRecords) {
        mediaRecords.forEach((record) => {
          const key = extractKey(record.link);
          if (key) objectPaths.push(key);
        });
      }
    }


    const myOwnedAlbums = userData.audio?.albums || [];
    const myOwnedAlbumIds = myOwnedAlbums.map((a) => a.id);
    if (myOwnedAlbumIds.length > 0) {
      const { data: audioDataFromDB } =
        await getSilanePlaylistsByAlbumIds(myOwnedAlbumIds);
      if (audioDataFromDB) {
        audioDataFromDB.forEach((pl) => {
          if (pl.track && Array.isArray(pl.track)) {
            pl.track.forEach((t) => {
              const key = extractKey(t.url);
              if (key) objectPaths.push(key);
            });
          }
        });
      }
    }

    // Visage
    if (userData.visage && userData.visage.items) {
      const profileIds = userData.visage.items
        .filter((i) => i.type === "profile")
        .map((i) => i.id);

      if (profileIds.length > 0) {
        const { data: fullProfiles } = await getSilaneVisageByIds(profileIds);
        if (fullProfiles) {
          fullProfiles.forEach((p) => {
            const tokenKey = extractKey(p.token_art);
            const portraitKey = extractKey(p.potrait_art);
            if (tokenKey) objectPaths.push(tokenKey);
            if (portraitKey) objectPaths.push(portraitKey);
          });
        }
      }
    }

    // Characters JSON
    if (userData.character && userData.character.items) {
      const charProfileIds = userData.character.items
        .filter((i) => i.type === "character")
        .map((i) => i.id);

      if (charProfileIds.length > 0) {
        const { data: fullChars } =
          await getSilaneCharacterByIds(charProfileIds);
        if (fullChars) {
          fullChars.forEach((c) => {
            if (c.metadata) {
              totalSizeBytes += Buffer.byteLength(
                JSON.stringify(c.metadata),
                "utf8",
              );
            }
            if (c.fvtt_data) {
              totalSizeBytes += Buffer.byteLength(
                JSON.stringify(c.fvtt_data),
                "utf8",
              );
            }
          });
        }
      }
    }

    // Fetch Sizes from R2
    if (typeof getFileSizeFromR2 === "function") {
      await Promise.all(
        objectPaths.map(async (path) => {
          try {
            const size = await getFileSizeFromR2(path);
            totalSizeBytes += size;
          } catch (err) {
            console.warn(`⚠️ Failed to get size for ${path}:`, err.message);
          }
        }),
      );
    }

    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

    res.status(200).json({
      message: "Storage usage calculated successfully",
      data: {
        total_files: objectPaths.length,
        total_bytes: totalSizeBytes,
        total_mb: parseFloat(totalSizeMB),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to calculate storage usage",
      error: error.message,
    });
  }
};

// ==========================================
// AUDIO ACTIONS
// ==========================================
export const uploadAudioTrack = async (req, res) => {
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

    req.file.originalname = generateRandomFileName(req.file.originalname);

    let fullUrl;
    try {
      fullUrl = await uploadAssetToR2({
        file: req.file,
        folderName: userData.public_id,
      });
    } catch (uploadErr) {
      return res
        .status(400)
        .json({ message: uploadErr.message || "Upload failed." });
    }

    let domain = process.env.SILANE_PUBLIC_DOMAIN || "";
    domain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const formattedUrl = `https://${domain}/${fullUrl}`;

    res.status(200).json({
      success: true,
      message: "Audio uploaded successfully",
      url: formattedUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Failed to upload audio",
    });
  }
};

export const updateAudioAlbum = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { albums } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, error: "Access denied" });
    if (!albums || !Array.isArray(albums))
      return res
        .status(400)
        .json({ success: false, error: "Invalid albums data" });

    let { data: myProfile, error: fetchErr } =
      await getHeraldSilaneByUserId(userId);

    if (!myProfile || (fetchErr && fetchErr.code === "PGRST116")) {
      const newSilanePayload = {
        user_id: userId,
        username: req.user?.username || "Unknown",
        public_id: generatePublicId(),
        character: { items: [] },
        visage: { items: [] },
        images: [],
        audio: { albums: [], joined_albums: [] },
      };
      const { data: createdSilane, error: createErr } =
        await createHeraldSilane(newSilanePayload);
      if (createErr) throw createErr;
      myProfile = createdSilane;
    }

    const existingAudio = myProfile?.audio || { albums: [], joined_albums: [] };

    const myOwnedAlbums = albums.map((a) => {
      return {
        ...a,
        user_id: userId,
        joined_user:
          a.joined_user?.length > 0
            ? a.joined_user
            : [{ user_id: userId, user_name: req.user?.username || "Owner" }],
      };
    });

    const updatedAudio = { ...existingAudio, albums: myOwnedAlbums };

    const { error: heraldErr } = await updateHeraldSilaneByUserId(userId, {
      audio: updatedAudio,
    });
    if (heraldErr) throw heraldErr;

    res.status(200).json({
      success: true,
      message: "Albums successfully updated in herald_silane",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateAudioPlaylist = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { playlists, activeAlbumIds } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, error: "Access denied" });
    if (!playlists || !Array.isArray(playlists))
      return res
        .status(400)
        .json({ success: false, error: "Invalid playlists data" });

    const playlistsToUpsert = playlists.map((p) => {
      const cleanTracks = (p.track || []).map((t) => ({
        ...t,
        user_id: t.user_id === "unknown" || !t.user_id ? userId : t.user_id,
        user_name:
          t.user_name === "Unknown" || !t.user_name
            ? req.user?.username || "Unknown"
            : t.user_name,
      }));

      const validUuid = p.uuid || p.id || crypto.randomUUID();

      return {
        uuid: validUuid,
        user_id: userId,
        user_name: p.user_name || req.user?.username || "Unknown",
        album_id: p.album_id,
        name: p.name,
        track: cleanTracks,
      };
    });

    if (playlistsToUpsert.length > 0) {
      const { error: upsertErr } =
        await upsertSilanePlaylists(playlistsToUpsert);
      if (upsertErr) throw upsertErr;
    }

    if (activeAlbumIds && Array.isArray(activeAlbumIds)) {
      const activePlaylistUuids = playlistsToUpsert.map((p) => p.uuid || p.id);
      await deleteOrphanedPlaylists(activeAlbumIds, activePlaylistUuids);
    }

    res.status(200).json({
      success: true,
      message: "Playlists successfully updated in silane_audio",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const joinAudioAlbum = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const userName = req.user?.username || "Unknown";
    const { invite_code } = req.body;

    if (!invite_code)
      return res
        .status(400)
        .json({ success: false, message: "Invite code required" });

    const { data: allProfiles } = await getAllHeraldSilaneAudio();
    let targetAlbum = null;
    let targetOwnerId = null;
    let targetAudioData = null;

    if (allProfiles) {
      for (const profile of allProfiles) {
        const pAudio = safeJsonParse(profile.audio, {});
        if (pAudio.albums) {
          const found = pAudio.albums.find(
            (a) => a.invite_code === invite_code,
          );
          if (found) {
            targetAlbum = found;
            targetOwnerId = profile.user_id;
            targetAudioData = pAudio;
            break;
          }
        }
      }
    }

    if (!targetAlbum)
      return res
        .status(404)
        .json({ success: false, message: "Album not found or invalid code." });

    if (String(targetOwnerId) === String(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot join your own album." });
    }

    if (!targetAlbum.joined_user) targetAlbum.joined_user = [];
    const alreadyJoined = targetAlbum.joined_user.find(
      (u) => String(u.user_id) === String(userId),
    );

    if (!alreadyJoined) {
      targetAlbum.joined_user.push({ user_id: userId, user_name: userName });
      await updateHeraldSilaneByUserId(targetOwnerId, {
        audio: targetAudioData,
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Joined album successfully" });
  } catch (error) {
    console.error("JOIN ALBUM ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
