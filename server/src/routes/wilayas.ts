import { Router } from 'express';
import { getAll } from '../controllers/wilayas.js';

const router = Router();

router.get('/', getAll);

export default router;
