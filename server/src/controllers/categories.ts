import { Request, Response } from 'express';
import Famille from '../models/Famille.js';
import Category from '../models/Category.js';

/* ---- Familles ---- */

export async function getAllFamilles(_req: Request, res: Response) {
  try {
    const familles = await Famille.find().sort({ sortOrder: 1, name: 1 });
    res.json(familles);
  } catch {
    res.status(500).json({ error: 'Failed to fetch familles' });
  }
}

export async function createFamille(req: Request, res: Response) {
  try {
    const famille = await Famille.create(req.body);
    res.status(201).json(famille);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Cette famille existe déjà' });
    }
    res.status(500).json({ error: 'Failed to create famille' });
  }
}

export async function updateFamille(req: Request, res: Response) {
  try {
    const famille = await Famille.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    if (!famille) return res.status(404).json({ error: 'Famille not found' });
    res.json(famille);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Cette famille existe déjà' });
    }
    res.status(500).json({ error: 'Failed to update famille' });
  }
}

export async function removeFamille(req: Request, res: Response) {
  try {
    const famille = await Famille.findByIdAndDelete(req.params.id);
    if (!famille) return res.status(404).json({ error: 'Famille not found' });
    await Category.updateMany({ familleId: req.params.id }, { $unset: { familleId: '' } });
    res.json({ message: 'Famille deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete famille' });
  }
}

/* ---- Categories ---- */

export async function getAllCategories(_req: Request, res: Response) {
  try {
    const categories = await Category.find()
      .populate('familleId')
      .sort({ sortOrder: 1, name: 1 });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const category = await Category.create(req.body);
    const populated = await category.populate('familleId');
    res.status(201).json(populated);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Cette catégorie existe déjà' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true }).populate('familleId');
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Cette catégorie existe déjà' });
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
}

export async function removeCategory(req: Request, res: Response) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete category' });
  }
}
