import { Router } from 'express';
import { getAll, getById, create, update, remove, bulkDelete, migrateIds } from '../controllers/products.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authMiddleware, create);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
router.post('/bulk-delete', authMiddleware, bulkDelete);
router.post('/migrate-ids', authMiddleware, migrateIds);

export default router;
