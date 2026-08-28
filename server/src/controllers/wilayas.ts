import { Request, Response } from 'express';
import { getWilayaCache } from '../utils/wilayaCache.js';

export async function getAll(_req: Request, res: Response) {
  try {
    const { wilayas } = await getWilayaCache();
    res.json(wilayas);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des wilayas' });
  }
}
