import { Router } from 'express';
import { login, me, updateMe, updatePassword } from '../controllers/admin.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, me);
router.patch('/me', authMiddleware, updateMe);
router.patch('/password', authMiddleware, updatePassword);

export default router;
