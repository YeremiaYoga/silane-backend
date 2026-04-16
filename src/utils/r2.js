// src/utils/r2.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import sharp from "sharp";
import path from "path";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const SILANE_BUCKET = process.env.SILANE_BUCKET_NAME;
const SILANE_DOMAIN = process.env.SILANE_PUBLIC_DOMAIN;

export async function uploadAssetToR2({ file, folderName }) {
    if (!file || !file.buffer) return null;

    try {
        const isImage = file.mimetype.startsWith("image/");
        const uniqueId = nanoid(10);
        let fileBuffer = file.buffer;
        let filename;
        let contentType;

        // Jika gambar, konversi ke WebP untuk optimasi
        if (isImage) {
             filename = `${uniqueId}.webp`;
             contentType = "image/webp";
             fileBuffer = await sharp(file.buffer).webp({ quality: 80 }).toBuffer();
        } else {
             const ext = path.extname(file.originalname);
             filename = `${uniqueId}${ext}`;
             contentType = file.mimetype;
        }
        
        const key = `${folderName}/${filename}`;
        const command = new PutObjectCommand({
             Bucket: SILANE_BUCKET,
             Key: key,
             Body: fileBuffer,
             ContentType: contentType,
        });

        await s3Client.send(command);
        
        // Return full public URL
        const cleanDomain = SILANE_DOMAIN.replace(/\/$/, ""); 
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

    const command = new DeleteObjectCommand({
      Bucket: SILANE_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`🗑️ Berhasil menghapus: ${key}`);
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

    const command = new HeadObjectCommand({
      Bucket: process.env.SILANE_BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    return response.ContentLength || 0;
  } catch (err) {
    return 0;
  }
}