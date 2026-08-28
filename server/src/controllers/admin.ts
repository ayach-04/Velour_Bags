import { Request, Response } from 'express';
import Admin from '../models/Admin.js';
import { generateToken } from '../middleware/auth.js';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email et mot de passe requis' });
      return;
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    if (!admin) {
      res.status(401).json({ message: 'Identifiants incorrects' });
      return;
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({ message: 'Identifiants incorrects' });
      return;
    }

    const token = generateToken({ id: admin._id.toString(), email: admin.email }, rememberMe);

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        image: admin.image,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const admin = await Admin.findById(req.admin?.id).select('-password');

    if (!admin) {
      res.status(404).json({ message: 'Admin non trouvé' });
      return;
    }

    res.json({ admin });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, image } = req.body;

    if (!name || !email) {
      res.status(400).json({ message: 'Nom et email requis' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await Admin.findOne({ email: normalizedEmail, _id: { $ne: req.admin?.id } });
    if (existing) {
      res.status(409).json({ message: 'Cet email est déjà utilisé' });
      return;
    }

    const update: Record<string, unknown> = { name: name.trim(), email: normalizedEmail };
    if (typeof image === 'string') update.image = image;

    const admin = await Admin.findByIdAndUpdate(
      req.admin?.id,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      res.status(404).json({ message: 'Admin non trouvé' });
      return;
    }

    res.json({ admin });
  } catch (err) {
    console.error('Update admin error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function updatePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    const admin = await Admin.findById(req.admin?.id);
    if (!admin) {
      res.status(404).json({ message: 'Admin non trouvé' });
      return;
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      return;
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}
