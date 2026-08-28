import { Router } from 'express';
import {
  getAllFamilles, createFamille, updateFamille, removeFamille,
  getAllCategories, createCategory, updateCategory, removeCategory,
} from '../controllers/categories.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/familles', getAllFamilles);
router.post('/familles', authMiddleware, createFamille);
router.put('/familles/:id', authMiddleware, updateFamille);
router.delete('/familles/:id', authMiddleware, removeFamille);

router.get('/', getAllCategories);
router.post('/', authMiddleware, createCategory);
router.put('/:id', authMiddleware, updateCategory);
router.delete('/:id', authMiddleware, removeCategory);

export default router;
