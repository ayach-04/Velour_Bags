import { Router } from 'express';
import { getAll, getOne, create, update, remove, importPrices, setDefault, getDefault } from '../controllers/delivery.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', getAll);
router.get('/default', getDefault);
router.get('/:id', getOne);
router.post('/', authMiddleware, create);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);
router.post('/import', authMiddleware, importPrices);
router.patch('/:id/default', authMiddleware, setDefault);

export default router;
