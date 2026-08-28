import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary.js';

export async function uploadImage(req: Request, res: Response) {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'velour-bags',
    });

    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err: any) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: `Upload failed: ${err?.message || 'unknown error'}` });
  }
}

export async function uploadImages(req: Request, res: Response) {
  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Images array is required' });
    }

    const results = await Promise.all(
      images.map((img: string) =>
        cloudinary.uploader.upload(img, { folder: 'velour-bags' })
      )
    );

    res.json(results.map((r) => ({ url: r.secure_url, publicId: r.public_id })));
  } catch (err) {
    console.error('Cloudinary batch upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}

export async function deleteImage(req: Request, res: Response) {
  try {
    const publicId = req.params.publicId as string;
    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
}
