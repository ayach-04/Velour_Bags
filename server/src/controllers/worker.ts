import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Worker from '../models/Worker.js';
import Order from '../models/Order.js';
import { generateWorkerToken } from '../middleware/workerAuth.js';
import { findProductsByIds, availableStock, applyStockDelta } from './order.js';
import { runDispatch, normalizeFrequency } from '../services/dispatch.js';

const USERNAME_REGEX = /^[a-z0-9._-]{2,30}$/;

function normalizeUsername(username: unknown): string {
  if (typeof username !== 'string') return '';
  return username.trim().toLowerCase();
}

export async function createWorker(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, phone, username, frequency } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Nom, email et mot de passe requis' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await Worker.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ message: 'Un employé avec cet email existe déjà' });
      return;
    }

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
      res.status(400).json({ message: "Nom d'utilisateur invalide (2-30 caractères : lettres, chiffres, . _ -)" });
      return;
    }
    if (normalizedUsername) {
      const usernameTaken = await Worker.findOne({ username: normalizedUsername });
      if (usernameTaken) {
        res.status(409).json({ message: "Ce nom d'utilisateur est déjà utilisé" });
        return;
      }
    }

    const worker = await Worker.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: typeof phone === 'string' ? phone.trim() : '',
      username: normalizedUsername || undefined,
      frequency: normalizeFrequency(frequency),
      createdBy: req.admin?.id,
    });

    const clean = worker.toObject() as unknown as Record<string, unknown>;
    delete clean.password;

    res.status(201).json({ worker: clean });
  } catch (err) {
    console.error('Create worker error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function listWorkers(req: Request, res: Response): Promise<void> {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 }).select('-password').lean();

    const [assigned, confirmed, cancelled] = await Promise.all([
      Order.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { 'confirmedBy.type': 'worker' } },
        { $group: { _id: '$confirmedBy.id', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { 'cancelledBy.type': 'worker' } },
        { $group: { _id: '$cancelledBy.id', total: { $sum: 1 } } },
      ]),
    ]);

    const toMap = (rows: { _id: unknown; total: number }[]) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        if (row._id != null) map.set(String(row._id), row.total);
      }
      return map;
    };

    const assignedMap = toMap(assigned);
    const confirmedMap = toMap(confirmed);
    const cancelledMap = toMap(cancelled);

    const workersWithStats = workers.map(w => {
      const totalOrders = assignedMap.get(String(w._id)) || 0;
      const confirmedOrders = confirmedMap.get(String(w._id)) || 0;
      const canceledOrders = cancelledMap.get(String(w._id)) || 0;
      return {
        ...w,
        stats: {
          totalOrders,
          confirmedOrders,
          canceledOrders,
          rate: totalOrders > 0 ? Math.round((confirmedOrders / totalOrders) * 100) : 0,
        },
      };
    });

    res.json({ workers: workersWithStats });
  } catch (err) {
    console.error('List workers error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function updateWorker(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, active, phone, username, frequency } = req.body;
    const worker = await Worker.findById(req.params.id);

    if (!worker) {
      res.status(404).json({ message: 'Employé non trouvé' });
      return;
    }

    if (typeof name === 'string' && name.trim()) worker.name = name.trim();
    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await Worker.findOne({ email: normalizedEmail, _id: { $ne: worker._id } });
      if (existing) {
        res.status(409).json({ message: 'Un employé avec cet email existe déjà' });
        return;
      }
      worker.email = normalizedEmail;
    }
    if (typeof phone === 'string') worker.phone = phone.trim();
    if (typeof username === 'string') {
      const normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
        res.status(400).json({ message: "Nom d'utilisateur invalide (2-30 caractères : lettres, chiffres, . _ -)" });
        return;
      }
      if (normalizedUsername) {
        const usernameTaken = await Worker.findOne({ username: normalizedUsername, _id: { $ne: worker._id } });
        if (usernameTaken) {
          res.status(409).json({ message: "Ce nom d'utilisateur est déjà utilisé" });
          return;
        }
      }
      worker.username = normalizedUsername || undefined;
    }
    if (typeof password === 'string' && password) {
      if (password.length < 6) {
        res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
        return;
      }
      worker.password = password;
    }
    if (typeof active === 'boolean') worker.active = active;
    if (frequency !== undefined) worker.frequency = normalizeFrequency(frequency);

    await worker.save();

    const clean = worker.toObject() as unknown as Record<string, unknown>;
    delete clean.password;

    res.json({ worker: clean });
  } catch (err) {
    console.error('Update worker error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email et mot de passe requis' });
      return;
    }

    const loginId = email.toLowerCase().trim();
    const worker = await Worker.findOne({ $or: [{ email: loginId }, { username: loginId }] });

    if (!worker) {
      res.status(401).json({ message: 'Identifiants incorrects' });
      return;
    }

    if (!worker.active) {
      res.status(403).json({ message: 'Votre compte a été désactivé' });
      return;
    }

    const isMatch = await worker.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({ message: 'Identifiants incorrects' });
      return;
    }

    const token = generateWorkerToken({ id: worker._id.toString(), email: worker.email }, rememberMe);

    const clean = worker.toObject() as unknown as Record<string, unknown>;
    delete clean.password;

    res.json({ token, worker: clean });
  } catch (err) {
    console.error('Worker login error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    const worker = await Worker.findById(req.worker?.id).select('-password');

    if (!worker) {
      res.status(404).json({ message: 'Employé non trouvé' });
      return;
    }

    res.json({ worker });
  } catch (err) {
    console.error('Worker me error:', err);
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

    const existing = await Worker.findOne({ email: normalizedEmail, _id: { $ne: req.worker?.id } });
    if (existing) {
      res.status(409).json({ message: 'Cet email est déjà utilisé' });
      return;
    }

    const update: Record<string, unknown> = { name: name.trim(), email: normalizedEmail };
    if (typeof image === 'string') update.image = image;

    const worker = await Worker.findByIdAndUpdate(
      req.worker?.id,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!worker) {
      res.status(404).json({ message: 'Employé non trouvé' });
      return;
    }

    res.json({ worker });
  } catch (err) {
    console.error('Update worker error:', err);
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

    const worker = await Worker.findById(req.worker?.id);
    if (!worker) {
      res.status(404).json({ message: 'Employé non trouvé' });
      return;
    }

    const isMatch = await worker.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      return;
    }

    worker.password = newPassword;
    await worker.save();

    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error('Worker update password error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function performance(req: Request, res: Response): Promise<void> {
  try {
    const workerId = req.worker?.id!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const aggregate = await Order.aggregate([
      { $match: { 'confirmedBy.id': new mongoose.Types.ObjectId(workerId) } },
      {
        $group: {
          _id: null,
          totalConfirmed: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          deliveredTotal: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } },
          returnedCount: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
    ]);

    const todayConfirmed = await Order.countDocuments({
      'confirmedBy.id': workerId,
      'confirmedBy.at': { $gte: today },
    });

    const cancelledByWorker = await Order.countDocuments({
      'cancelledBy.id': workerId,
    });

    const stats = aggregate[0] || {
      totalConfirmed: 0,
      totalRevenue: 0,
      deliveredCount: 0,
      deliveredTotal: 0,
      returnedCount: 0,
      cancelledCount: 0,
    };

    res.json({ performance: { ...stats, todayConfirmed, cancelledByWorker } });
  } catch (err) {
    console.error('Worker performance error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function listConfirmOrders(req: Request, res: Response): Promise<void> {
  try {
    const orders = await Order.find({
      status: 'not_confirmed',
      archived: { $ne: true },
      assignedTo: req.worker?.id,
    })
      .sort({ createdAt: 1 })
      .populate('deliveryCompany', 'name abbreviation')
      .limit(200);

    res.json({ orders });
  } catch (err) {
    console.error('Worker list orders error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}

export async function updateWorkerOrder(req: Request, res: Response): Promise<void> {
  try {
    const { firstName, lastName, phone, wilaya, commune, address, items, deliveryCompany, deliveryMethod, deliveryCost, total } = req.body;

    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    if (currentOrder.status !== 'not_confirmed') {
      res.status(400).json({ error: 'Seules les commandes non confirmées peuvent être modifiées' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'La commande doit contenir au moins un article' });
      return;
    }

    const newItems = items.map((item: any) => ({
      product: String(item.product),
      name: item.name,
      price: Number(item.price),
      quantity: Math.max(1, Math.floor(Number(item.quantity))),
      image: item.colorImage || item.image || '',
      volume: item.volume || '',
      color: item.color || '',
      colorImage: item.colorImage || '',
    }));

    const itemKey = (item: { product: string; volume?: string; color?: string }) => `${String(item.product)}::${item.volume || ''}::${item.color || ''}`;

    const currentMap = new Map<string, { quantity: number }>();
    for (const item of currentOrder.items) {
      currentMap.set(itemKey(item), item);
    }

    const newKeys = newItems.map(itemKey);
    const allIds = [...new Set([...currentMap.keys(), ...newKeys].map(k => k.split('::')[0]))];
    const productMap = await findProductsByIds(allIds);

    const deltas = new Map<string, number>();
    for (const item of newItems) {
      const key = itemKey(item);
      const prev = currentMap.get(key)?.quantity || 0;
      deltas.set(key, (deltas.get(key) || 0) + item.quantity - prev);
    }
    for (const [id, cur] of currentMap) {
      if (!deltas.has(id)) deltas.set(id, -cur.quantity);
    }

    for (const [key, delta] of deltas) {
      if (delta <= 0) continue;
      const [pid, volumeLabel, colorName] = key.split('::');
      const product = productMap.get(pid);
      if (!product) {
        res.status(400).json({ error: 'Produit introuvable' });
        return;
      }
      const available = availableStock(product, volumeLabel || undefined, colorName || undefined);
      if (available < delta) {
        res.status(400).json({ error: `Stock insuffisant pour "${product.name}${colorName ? ` (${colorName})` : volumeLabel ? ` (${volumeLabel})` : ''}" (${available} disponible${available !== 1 ? 's' : ''}, ${delta} demandé${delta !== 1 ? 's' : ''})` });
        return;
      }
    }

    await Promise.all([...deltas.entries()].map(([key, delta]) => {
      if (delta === 0) return Promise.resolve();
      const [pid, volumeLabel, colorName] = key.split('::');
      const product = productMap.get(pid);
      return product ? applyStockDelta(product, -delta, volumeLabel || undefined, colorName || undefined) : Promise.resolve();
    }));

    const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        firstName: firstName?.trim(),
        lastName: lastName?.trim() || '',
        phone: phone?.trim(),
        wilaya,
        commune: commune || '',
        address: address || '',
        items: newItems,
        subtotal,
        deliveryCost: deliveryCost || 0,
        total,
        deliveryCompany: deliveryCompany ? deliveryCompany : null,
        deliveryMethod: deliveryMethod === 'home' || deliveryMethod === 'stopdesk' ? deliveryMethod : null,
      },
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice');

    if (!order) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error('Worker update order error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la commande' });
  }
}

export async function confirmOrder(req: Request, res: Response): Promise<void> {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    if (order.status !== 'not_confirmed') {
      res.status(400).json({ error: 'Cette commande ne peut plus être confirmée' });
      return;
    }

    const workerId = req.worker?.id!;
    const worker = await Worker.findById(workerId).select('name email');
    const workerName = worker ? worker.name : req.worker?.email || 'Employé';

    order.status = 'confirmed';
    order.confirmedBy = {
      id: workerId,
      type: 'worker',
      name: workerName,
      at: new Date(),
    };
    order.history.push({
      status: 'confirmed',
      byType: 'worker',
      byId: workerId,
      byName: workerName,
      at: new Date(),
    });

    await order.save();

    const updated = await Order.findById(order._id)
      .populate('deliveryCompany', 'name abbreviation')
      .lean();

    res.json(updated);
  } catch (err) {
    console.error('Worker confirm order error:', err);
    res.status(500).json({ error: 'Erreur lors de la confirmation' });
  }
}

export async function cancelWorkerOrder(req: Request, res: Response): Promise<void> {
  try {
    const currentOrder = await Order.findById(req.params.id);

    if (!currentOrder) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    if (currentOrder.status !== 'not_confirmed') {
      res.status(400).json({ error: 'Seules les commandes non confirmées peuvent être annulées' });
      return;
    }

    const workerId = req.worker?.id!;
    const worker = await Worker.findById(workerId).select('name email');
    const workerName = worker ? worker.name : req.worker?.email || 'Employé';

    const productMap = await findProductsByIds(currentOrder.items.map(i => i.product));
    await Promise.all(currentOrder.items.map(item => {
      const product = productMap.get(item.product);
      return product ? applyStockDelta(product, item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
    }));

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        confirmedBy: null,
        cancelledBy: {
          id: workerId,
          type: 'worker',
          name: workerName,
          at: new Date(),
        },
        $push: {
          history: {
            status: 'cancelled',
            byType: 'worker' as const,
            byId: workerId,
            byName: workerName,
            at: new Date(),
          },
        },
      },
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation');

    if (!order) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error('Worker cancel order error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la commande' });
  }
}

export async function dispatchOrders(req: Request, res: Response): Promise<void> {
  try {
    const assigned = await runDispatch();
    res.json({ assigned });
  } catch (err) {
    console.error('Dispatch orders error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}