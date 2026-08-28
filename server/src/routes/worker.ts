import { Router } from 'express';
import {
  login,
  me,
  updateMe,
  updatePassword,
  performance,
  listConfirmOrders,
  confirmOrder,
  cancelWorkerOrder,
  updateWorkerOrder,
  createWorker,
  listWorkers,
  updateWorker,
  dispatchOrders,
} from '../controllers/worker.js';
import { authMiddleware } from '../middleware/auth.js';
import { workerAuthMiddleware } from '../middleware/workerAuth.js';

const router = Router();

router.post('/login', login);

router.get('/me', workerAuthMiddleware, me);
router.patch('/me', workerAuthMiddleware, updateMe);
router.patch('/password', workerAuthMiddleware, updatePassword);
router.get('/performance', workerAuthMiddleware, performance);
router.get('/orders', workerAuthMiddleware, listConfirmOrders);
router.patch('/orders/:id', workerAuthMiddleware, updateWorkerOrder);
router.patch('/orders/:id/confirm', workerAuthMiddleware, confirmOrder);
router.patch('/orders/:id/cancel', workerAuthMiddleware, cancelWorkerOrder);

router.get('/', authMiddleware, listWorkers);
router.post('/', authMiddleware, createWorker);
router.patch('/:id', authMiddleware, updateWorker);

router.post('/dispatch/run', authMiddleware, dispatchOrders);

export default router;
