import { Request, Response } from 'express';
import Product from '../models/Product.js';
import type { IVolume, IColor } from '../models/Product.js';

function normalizeVolumes(volumes: any): IVolume[] | undefined {
  if (!Array.isArray(volumes)) return undefined;
  const cleaned = volumes
    .filter((v: any) => v && typeof v.label === 'string' && v.label.trim())
    .map((v: any) => ({
      label: String(v.label).trim(),
      price: Number(v.price) || 0,
      costPrice: v.costPrice !== undefined && v.costPrice !== null && v.costPrice !== '' ? Number(v.costPrice) : undefined,
      stock: v.stock !== undefined && v.stock !== null && v.stock !== '' ? Number(v.stock) : 0,
      oldPrice: v.oldPrice !== undefined && v.oldPrice !== null && v.oldPrice !== '' ? Number(v.oldPrice) : undefined,
    }));
  return cleaned.length ? cleaned : undefined;
}

function normalizeColors(colors: any): IColor[] | undefined {
  if (!Array.isArray(colors)) return undefined;
  const cleaned = colors
    .filter((c: any) => c && typeof c.name === 'string' && c.name.trim())
    .map((c: any) => ({
      name: String(c.name).trim(),
      price: Number(c.price) || 0,
      costPrice: c.costPrice !== undefined && c.costPrice !== null && c.costPrice !== '' ? Number(c.costPrice) : undefined,
      stock: c.stock !== undefined && c.stock !== null && c.stock !== '' ? Number(c.stock) : 0,
      oldPrice: c.oldPrice !== undefined && c.oldPrice !== null && c.oldPrice !== '' ? Number(c.oldPrice) : undefined,
      image: String(c.image || ''),
      images: Array.isArray(c.images) ? c.images : [],
    }));
  return cleaned.length ? cleaned : undefined;
}

function applyColors(body: Record<string, any>, colors?: IColor[]) {
  if (colors && colors.length) {
    body.colors = colors;
    const first = colors[0];
    body.price = first.price;
    body.costPrice = first.costPrice;
    body.stock = first.stock;
    body.volume = first.name;
    body.image = first.image || body.image;
  } else {
    delete body.colors;
  }
}

function applyVolumes(body: Record<string, any>, volumes?: IVolume[]) {
  if (volumes && volumes.length) {
    body.volumes = volumes;
    const first = volumes[0];
    body.price = first.price;
    body.costPrice = first.costPrice;
    body.stock = first.stock;
    body.volume = first.label;
  } else {
    delete body.volumes;
  }
}

export async function getAll(req: Request, res: Response) {
  try {
    const products = await Product.find().sort({ id: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const paramId = req.params.id as string;
    let product;
    if (paramId.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(paramId);
    } else {
      product = await Product.findOne({ id: Number(paramId) });
    }
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const last = await Product.findOne().sort({ id: -1 });
    const body: Record<string, any> = { ...req.body, id: (last?.id || 0) + 1 };
    const incomingColors = normalizeColors(body.colors);
    if (incomingColors) {
      applyColors(body, incomingColors);
    }
    applyVolumes(body, normalizeVolumes(body.volumes));
    const product = await Product.create(body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
}

function computeStockTotal(body: Record<string, any>, existing: any): number {
  if (Array.isArray(body.colors)) return body.colors.reduce((s: number, c: any) => s + (c.stock ?? 0), 0);
  if (Array.isArray(body.volumes)) return body.volumes.reduce((s: number, v: any) => s + (v.stock ?? 0), 0);
  if (body.stock !== undefined && body.stock !== null && body.stock !== '') return Number(body.stock) || 0;
  if (Array.isArray(existing.colors) && existing.colors.length) return existing.colors.reduce((s: number, c: any) => s + (c.stock ?? 0), 0);
  if (Array.isArray(existing.volumes) && existing.volumes.length) return existing.volumes.reduce((s: number, v: any) => s + (v.stock ?? 0), 0);
  return existing.stock ?? 0;
}

export async function update(req: Request, res: Response) {
  try {
    const paramId = req.params.id as string;
    let existing;
    if (paramId.match(/^[0-9a-fA-F]{24}$/)) {
      existing = await Product.findById(paramId);
    } else {
      existing = await Product.findOne({ id: Number(paramId) });
    }
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const body: Record<string, any> = { ...req.body };

    const incomingColors = normalizeColors(body.colors);
    if (incomingColors) {
      applyColors(body, incomingColors);
    } else if (Array.isArray(existing.colors) && existing.colors.length) {
      body.colors = existing.colors;
    } else {
      delete body.colors;
    }

    const incomingVolumes = normalizeVolumes(body.volumes);
    if (incomingVolumes) {
      applyVolumes(body, incomingVolumes);
    } else if (Array.isArray(existing.volumes) && existing.volumes.length) {
      body.volumes = existing.volumes.map(v => ({
        label: v.label,
        price: v.price,
        costPrice: v.costPrice,
        stock: v.stock,
        oldPrice: v.oldPrice,
      }));
      if (body.stock !== undefined) body.volumes[0].stock = Number(body.stock);
      applyVolumes(body, body.volumes);
    } else {
      delete body.volumes;
    }

    const ops: Record<string, any> = {};
    const set: Record<string, any> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) set[k] = v;
    }
    ops.$set = set;

    const stockTotal = computeStockTotal(body, existing);
    if (stockTotal <= 0) {
      ops.$set.label = 'OUT_OF_STOCK';
    } else if (ops.$set.label === 'OUT_OF_STOCK') {
      delete ops.$set.label;
      ops.$unset = { label: 1 };
    } else if (existing.label === 'OUT_OF_STOCK' && ops.$set.label === undefined) {
      ops.$unset = { label: 1 };
    }
    if (Object.keys(ops.$set).length === 0) delete ops.$set;

    let product;
    if (paramId.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findByIdAndUpdate(paramId, ops, { returnDocument: 'after' });
    } else {
      product = await Product.findOneAndUpdate({ id: Number(paramId) }, ops, { returnDocument: 'after' });
    }
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
}

export async function bulkDelete(req: Request, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    const result = await Product.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete products' });
  }
}

export async function migrateIds(req: Request, res: Response) {
  try {
    const missing = await Product.find({ id: { $exists: false } });
    if (missing.length === 0) return res.json({ updated: 0, message: 'All products already have an id' });

    const last = await Product.findOne().sort({ id: -1 });
    let nextId = (last?.id || 0) + 1;

    for (const product of missing) {
      await Product.updateOne({ _id: product._id }, { $set: { id: nextId++ } });
    }

    res.json({ updated: missing.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to migrate ids' });
  }
}
