import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import sharp from "sharp";
import path from "path";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadAssetToR2({ file, folderName, customFileName, bucketName, domainUrl }) {
  if (!file || !file.buffer) return null;
  const isImage = file.mimetype.startsWith("image/");
  const isAudio = file.mimetype.startsWith("audio/");
  const MAX_SIZE = isAudio ? 10 * 1024 * 1024 : 3 * 1024 * 1024;
  const currentSize = file.size || file.buffer.length;
  if (currentSize > MAX_SIZE) {
    const errMsg = isAudio
      ? "Failed because audio file is over 10mb"
      : "Failed because file is over 3mb";
    console.warn(`⚠️ ${errMsg}`);
    throw new Error(errMsg);
  }
  try {
    const uniqueId = nanoid(10);
    let fileBuffer = file.buffer;
    let filename;
    let contentType;
    if (isImage) {
      filename = customFileName
        ? (customFileName.endsWith(".webp") ? customFileName : `${customFileName}.webp`)
        : `${uniqueId}.webp`;
      contentType = "image/webp";
      fileBuffer = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
    } else {
      const ext = path.extname(file.originalname);
      filename = customFileName ? customFileName : `${uniqueId}${ext}`;
      contentType = file.mimetype;
    }
    const key = folderName ? `${folderName}/${filename}` : filename;

    const targetBucket = bucketName || process.env.SILANE_BUCKET_NAME || "silane";

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });
    await s3Client.send(command);

    let cleanDomain = domainUrl || process.env.SILANE_PUBLIC_DOMAIN || "sih4storage.phanneldeliver.my.id";
    cleanDomain = cleanDomain.replace(/\/$/, "");
    if (!cleanDomain.startsWith("http://") && !cleanDomain.startsWith("https://")) {
      cleanDomain = `https://${cleanDomain}`;
    }
    return `${cleanDomain}/${key}`;
  } catch (err) {
    console.error(`💥 R2 Upload Error:`, err);
    return null;
  }
}

export async function deleteAssetFromR2(fileUrl) {
  if (!fileUrl) return;
  try {
    let key;
    if (fileUrl.startsWith("http")) {
      const urlObj = new URL(fileUrl);
      key = urlObj.pathname;
    } else {
      key = fileUrl;
    }
    if (key.startsWith("/")) key = key.substring(1);
    key = decodeURIComponent(key);

    const igniteDomain = (process.env.IGNITE_PUBLIC_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const igniteBucket = process.env.IGNITE_BUCKET_NAME?.trim() || "projectignite";
    const silaneBucket = process.env.SILANE_BUCKET_NAME?.trim() || "silane";

    let targetBucket = silaneBucket;
    if (
      (igniteDomain && fileUrl.includes(igniteDomain)) ||
      fileUrl.includes("projectignite")
    ) {
      targetBucket = igniteBucket;
    }

    const command = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });
    await s3Client.send(command);
    console.log(`🗑️ Berhasil menghapus: ${key} dari bucket ${targetBucket}`);
    return true;
  } catch (err) {
    console.error(`💥 R2 Delete Error:`, err);
    return false;
  }
}

export async function getFileSizeFromR2(fileUrl) {
  if (!fileUrl) return 0;
  try {
    let key = fileUrl.startsWith("http") ? new URL(fileUrl).pathname : fileUrl;
    if (key.startsWith("/")) key = key.substring(1);
    key = decodeURIComponent(key);

    const igniteDomain = (process.env.IGNITE_PUBLIC_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    const igniteBucket = process.env.IGNITE_BUCKET_NAME?.trim() || "projectignite";
    const silaneBucket = process.env.SILANE_BUCKET_NAME?.trim() || "silane";

    let targetBucket = silaneBucket;
    if (
      (igniteDomain && fileUrl.includes(igniteDomain)) ||
      fileUrl.includes("projectignite")
    ) {
      targetBucket = igniteBucket;
    }

    const command = new HeadObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });
    const res = await s3Client.send(command);
    return res.ContentLength || 0;
  } catch (err) {
    console.error(`💥 R2 Head Error:`, err);
    return 0;
  }
}