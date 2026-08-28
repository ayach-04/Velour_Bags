import { Router } from 'express';
import { create, getActive, getCancelled, getConfirmed, getReturned, getShipped, getDelivered, getStats, getMonthlyStats, getDashboard, getArchive, archiveOrders, getById, updateStatus, remove, restore, returnOrder, restoreStock, updateClientInfo, reactivate, updateOrder } from '../controllers/order.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', create);
router.delete('/', authMiddleware, remove);
router.post('/archive', authMiddleware, archiveOrders);
router.get('/active', authMiddleware, getActive);
router.get('/cancelled', authMiddleware, getCancelled);
router.get('/confirmed', authMiddleware, getConfirmed);
router.get('/returned', authMiddleware, getReturned);
router.get('/shipped', authMiddleware, getShipped);
router.get('/delivered', authMiddleware, getDelivered);
router.get('/stats', authMiddleware, getStats);
router.get('/monthly', authMiddleware, getMonthlyStats);
router.get('/dashboard', authMiddleware, getDashboard);
router.get('/archive', authMiddleware, getArchive);
router.get('/:id', authMiddleware, getById);
router.patch('/:id', authMiddleware, updateOrder);
router.patch('/:id/status', authMiddleware, updateStatus);
router.patch('/:id/restore', authMiddleware, restore);
router.patch('/:id/return', authMiddleware, returnOrder);
router.patch('/:id/restore-stock', authMiddleware, restoreStock);
router.patch('/:id/client', authMiddleware, updateClientInfo);
router.patch('/:id/reactivate', authMiddleware, reactivate);

export default router;
