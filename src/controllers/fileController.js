import minioClient from '../utils/minio.js';

const bucketName = process.env.MINIO_BUCKET_NAME;

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Tidak ada file yang diunggah' });
        }

        const file = req.file;
        const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`; 

        // Upload ke MinIO
        await minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
            'Content-Type': file.mimetype
        });

        res.status(200).json({
            message: 'File berhasil diupload ke MinIO',
            fileName: fileName
        });
    } catch (error) {
        console.error('Error Upload:', error);
        res.status(500).json({ message: 'Gagal upload file', error: error.message });
    }
};

export const getFileUrl = async (req, res) => {
    try {
        const { fileName } = req.params;
        
        // Generate Presigned URL (Masa aktif URL: 24 jam / 86400 detik)
        const expiry = 24 * 60 * 60; 
        const url = await minioClient.presignedGetObject(bucketName, fileName, expiry);

        res.status(200).json({ url });
    } catch (error) {
        console.error('Error Get File:', error);
        res.status(500).json({ message: 'Gagal mendapatkan URL file', error: error.message });
    }
};