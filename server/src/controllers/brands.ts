import { Request, Response } from 'express';
import Brand from '../models/Brand.js';

export async function getAll(_req: Request, res: Response) {
  try {
    const brands = await Brand.find().sort({ sortOrder: 1, name: 1 });
    res.json(brands);
  } catch {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json(brand);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Cette marque existe déjà' });
    }
    res.status(500).json({ error: 'Failed to create brand' });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Cette marque existe déjà' });
    }
    res.status(500).json({ error: 'Failed to update brand' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({ message: 'Brand deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete brand' });
  }
}
