import express from 'express';
import { uploadFile, getFileUrl } from '../controllers/fileController.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Endpoint untuk upload file (menunggu input form dengan key "file")
router.post('/upload', upload.single('file'), uploadFile);

// Endpoint untuk mendapatkan URL file berdasarkan nama filenya
router.get('/get/:fileName', getFileUrl);

export default router;