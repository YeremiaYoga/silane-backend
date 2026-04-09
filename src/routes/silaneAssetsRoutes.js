import express from 'express';
import { uploadMedia, getDataSilane } from '../controllers/silaneAssetsController.js';
import upload from '../middlewares/uploadMiddleware.js'; 
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/data', verifyToken, getDataSilane);
router.post('/upload', verifyToken, upload.single('file'), uploadMedia);

export default router;