import { Router } from 'express';
import { uploadImage, uploadImages, deleteImage } from '../controllers/upload.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/image', authMiddleware, uploadImage);
router.post('/images', authMiddleware, uploadImages);
router.delete('/image/:publicId', authMiddleware, deleteImage);

export default router;
