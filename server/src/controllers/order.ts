import { Request, Response } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Worker from '../models/Worker.js';
import DeliveryCompany from '../models/DeliveryCompany.js';
import { getWilayaCache } from '../utils/wilayaCache.js';
import { sendOrderNotification } from '../utils/email.js';
import { dispatchNewOrder } from '../services/dispatch.js';

function getVolume(product: any, label?: string) {
  if (!label || !Array.isArray(product.volumes)) return null;
  return product.volumes.find((v: any) => v.label === label) || null;
}

export function getColor(product: any, colorName?: string) {
  if (!colorName || !Array.isArray(product.colors)) return null;
  return product.colors.find((c: any) => c.name === colorName) || null;
}

export function availableStock(product: any, label?: string, colorName?: string): number {
  if (colorName) {
    const col = getColor(product, colorName);
    return col ? (col.stock ?? 0) : 0;
  }
  const vol = getVolume(product, label);
  if (vol) return vol.stock ?? 0;
  return product.stock ?? 0;
}

function getCostPrice(product: any, label?: string, colorName?: string): number {
  if (colorName) {
    const col = getColor(product, colorName);
    if (col && col.costPrice !== undefined) return col.costPrice;
  }
  const vol = getVolume(product, label);
  if (vol && vol.costPrice !== undefined) return vol.costPrice;
  return product.costPrice ?? 0;
}

function productStockTotal(product: any): number {
  if (Array.isArray(product.colors) && product.colors.length) return product.colors.reduce((s: number, c: any) => s + (c.stock ?? 0), 0);
  if (Array.isArray(product.volumes) && product.volumes.length) return product.volumes.reduce((s: number, v: any) => s + (v.stock ?? 0), 0);
  return product.stock ?? 0;
}

export async function applyStockDelta(product: any, delta: number, label?: string, colorName?: string) {
  const inc: any = colorName
    ? { 'colors.$[c].stock': delta }
    : getVolume(product, label)
    ? { 'volumes.$[v].stock': delta }
    : { stock: delta };

  const ops: any = { $inc: inc };
  if (productStockTotal(product) + delta <= 0) {
    ops.$set = { label: 'OUT_OF_STOCK' };
  } else if (product.label === 'OUT_OF_STOCK') {
    ops.$unset = { label: 1 };
  }

  if (colorName) {
    return Product.updateOne(
      { _id: product._id },
      ops,
      { arrayFilters: [{ 'c.name': colorName }] }
    );
  }
  const vol = getVolume(product, label);
  if (vol) {
    return Product.updateOne(
      { _id: product._id },
      ops,
      { arrayFilters: [{ 'v.label': label }] }
    );
  }
  return Product.updateOne({ _id: product._id }, ops);
}

function normalizeOrderItem(item: any) {
  return {
    product: String(item.product),
    name: item.name,
    price: Number(item.price),
    quantity: Math.max(1, Math.floor(Number(item.quantity))),
    image: item.image || '',
    volume: item.volume || '',
    color: item.color || '',
    colorImage: item.colorImage || '',
    costPrice: Number(item.costPrice) || 0,
  };
}

export async function updateClientInfo(req: Request, res: Response) {
  try {
    const { firstName, lastName, phone, wilaya, commune, address } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, phone, wilaya, commune, address },
      { new: true }
    ).select(ORDER_FIELDS);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

export async function updateOrder(req: Request, res: Response) {
  try {
    const { firstName, lastName, phone, wilaya, commune, address, items, deliveryCompany, deliveryMethod, deliveryCost, total } = req.body;

    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) return res.status(404).json({ error: 'Commande introuvable' });

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La commande doit contenir au moins un article' });
    }

    const newItems = items.map(normalizeOrderItem);

    const itemKey = (item: { product: string; volume?: string; color?: string }) => `${String(item.product)}::${item.volume || ''}::${item.color || ''}`;

    const currentMap = new Map<string, { quantity: number }>();
    for (const item of currentOrder.items) {
      currentMap.set(itemKey(item), item);
    }

    const allIds = [...new Set([...currentMap.keys(), ...newItems.map(i => itemKey(i))].map(k => k.split('::')[0]))];
    const productMap = await findProductsByIds(allIds);

    for (const item of newItems) {
      const product = productMap.get(item.product);
      if (product) item.costPrice = getCostPrice(product, item.volume || undefined, item.color || undefined);
    }

    const deltas = new Map<string, number>();
    for (const item of newItems) {
      const prev = currentMap.get(itemKey(item))?.quantity || 0;
      deltas.set(itemKey(item), (deltas.get(itemKey(item)) || 0) + item.quantity - prev);
    }
    for (const [id, cur] of currentMap) {
      if (!deltas.has(id)) deltas.set(id, -cur.quantity);
    }

    for (const [key, delta] of deltas) {
      if (delta <= 0) continue;
      const [pid, volumeLabel, colorName] = key.split('::');
      const product = productMap.get(pid);
      if (!product) {
        return res.status(400).json({ error: 'Produit introuvable' });
      }
      const available = availableStock(product, volumeLabel || undefined, colorName || undefined);
      if (available < delta) {
        return res.status(400).json({ error: `Stock insuffisant pour "${product.name}${colorName ? ` (${colorName})` : volumeLabel ? ` (${volumeLabel})` : ''}" (${available} disponible${available !== 1 ? 's' : ''}, ${delta} demandé${delta !== 1 ? 's' : ''})` });
      }
    }

    await Promise.all([...deltas.entries()].map(([key, delta]) => {
      if (delta === 0) return Promise.resolve();
      const [pid, volumeLabel, colorName] = key.split('::');
      const product = productMap.get(pid);
      return product ? applyStockDelta(product, -delta, volumeLabel || undefined, colorName || undefined) : Promise.resolve();
    }));

    const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const updateData: Record<string, any> = {
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
    };

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice');

    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la commande' });
  }
}

const ORDER_FIELDS = 'orderNumber firstName lastName phone wilaya commune address status archived total subtotal deliveryCost deliveryMethod deliveryCompany items orderNote returnReason stockRestored deliveredAt returnedAt archivedAt createdAt confirmedBy cancelledBy assignedTo';

export async function findProductsByIds(ids: string[]) {
  const validObjectIds = ids.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
  const numIds = ids.map(id => Number(id)).filter(n => Number.isInteger(n) && n > 0);
  const orFilters: any[] = [];
  if (validObjectIds.length) orFilters.push({ _id: { $in: validObjectIds } });
  if (numIds.length) orFilters.push({ id: { $in: numIds } });
  if (!orFilters.length) return new Map<string, any>();
  const products = await Product.find({ $or: orFilters }).select('id stock name image category volumes colors brand');
  const map = new Map<string, any>();
  for (const p of products) {
    map.set(String(p._id), p);
    if (p.id != null) map.set(String(p.id), p);
  }
  return map;
}

export async function create(req: Request, res: Response) {
  try {
    const { firstName, lastName, phone, wilaya, commune, address, orderNote, items, subtotal, deliveryCompany, deliveryMethod, deliveryCost, total } = req.body;

    if (!firstName?.trim() || !phone?.trim() || !items?.length) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const orderItems = items.map(normalizeOrderItem);

    const productMap = await findProductsByIds(orderItems.map((item: any) => item.product));

    for (const item of orderItems) {
      const product = productMap.get(item.product);
      if (!product) {
        return res.status(400).json({ error: `Produit introuvable: ${item.name}` });
      }
      item.costPrice = getCostPrice(product, item.volume || undefined, item.color || undefined);
      const available = availableStock(product, item.volume || undefined, item.color || undefined);
      if (available < item.quantity) {
        return res.status(400).json({ error: `Stock insuffisant pour "${product.name}${item.color ? ` (${item.color})` : ''}${!item.color && item.volume ? ` (${item.volume})` : ''}" (${available} disponible${available !== 1 ? 's' : ''}, ${item.quantity} demandé${item.quantity !== 1 ? 's' : ''})` });
      }
    }

    await Promise.all(orderItems.map((item: any) => {
      const product = productMap.get(item.product);
      return product ? applyStockDelta(product, -item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
    }));

    const orderData: Record<string, any> = {
      firstName: firstName.trim(),
      lastName: lastName?.trim() || '',
      phone: phone.trim(),
      wilaya,
      commune: commune || '',
      address: address || '',
      orderNote: orderNote || '',
      items: orderItems,
      subtotal,
      deliveryCost: deliveryCost || 0,
      total,
      status: 'not_confirmed',
    };

    if (deliveryCompany && deliveryMethod) {
      orderData.deliveryCompany = deliveryCompany;
      orderData.deliveryMethod = deliveryMethod;
    } else if (!deliveryCompany && deliveryCost === 0) {
      const { codeToId } = await getWilayaCache();
      const wilayaCode = (wilaya || '').split(' - ')[0];
      const wilayaObjectId = codeToId.get(String(Number(wilayaCode)));

      if (wilayaObjectId) {
        const activeCompanies = await DeliveryCompany.find({ isActive: true }).lean();
        const companiesWithWilaya = activeCompanies.filter(c =>
          c.prices.some(p => String(p.wilaya) === String(wilayaObjectId))
        );

        if (companiesWithWilaya.length > 0) {
          const defaultCompany = companiesWithWilaya.find(c => c.isDefault) || companiesWithWilaya[0];
          const priceEntry = defaultCompany.prices.find(p => String(p.wilaya) === String(wilayaObjectId));

          orderData.deliveryCompany = String(defaultCompany._id);
          if (priceEntry) {
            if (priceEntry.homeDelivery !== null) {
              orderData.deliveryMethod = 'home';
            } else if (priceEntry.stopDesk !== null) {
              orderData.deliveryMethod = 'stopdesk';
            }
          }
        }
      }
    }

    const order = await Order.create(orderData);

    await dispatchNewOrder(order._id);

    sendOrderNotification({
      orderNumber: order.orderNumber,
      firstName: orderData.firstName,
      lastName: orderData.lastName,
      phone: orderData.phone,
      wilaya: orderData.wilaya,
      commune: orderData.commune,
      address: orderData.address,
      items: orderData.items,
      subtotal: orderData.subtotal,
      deliveryCost: orderData.deliveryCost,
      total: orderData.total,
      orderNote: orderData.orderNote,
    }).catch(() => {});

    res.status(201).json(order);
  } catch (err: any) {
    console.error('Order create error:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Erreur de création' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
}

export async function getActive(_req: Request, res: Response) {
  try {
    const orders = await Order.find({
      status: { $in: ['not_confirmed', 'confirmed', 'shipped'] }
    })
      .select(ORDER_FIELDS)
      .lean()
      .populate('deliveryCompany', 'name abbreviation')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
}

export async function getCancelled(_req: Request, res: Response) {
  try {
    const orders = await Order.find({ status: 'cancelled', archived: { $ne: true } })
      .select(ORDER_FIELDS)
      .lean()
      .populate('deliveryCompany', 'name abbreviation')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const order = await Order.findById(req.params.id)
      .lean()
      .populate('deliveryCompany', 'name abbreviation');
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
  }
}

export async function updateStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    const validStatuses = ['not_confirmed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'archived', 'returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) return res.status(404).json({ error: 'Commande introuvable' });

    if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
      const productMap = await findProductsByIds(currentOrder.items.map(i => i.product));
      await Promise.all(currentOrder.items.map(item => {
        const product = productMap.get(item.product);
        return product ? applyStockDelta(product, item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
      }));
    }

    if (status !== 'cancelled' && currentOrder.status === 'cancelled') {
      const productMap = await findProductsByIds(currentOrder.items.map(i => i.product));
      await Promise.all(currentOrder.items.map(item => {
        const product = productMap.get(item.product);
        return product ? applyStockDelta(product, -item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
      }));
    }

    const updateData: Record<string, any> = { status };

    const actorName = req.admin?.email || 'Administrateur';

    updateData.$push = {
      history: {
        status,
        byType: 'admin' as const,
        byId: req.admin?.id,
        byName: actorName,
        at: new Date(),
      },
    };

    if (status === 'confirmed' && currentOrder.status !== 'confirmed') {
      updateData.confirmedBy = {
        id: req.admin?.id,
        type: 'admin',
        name: actorName,
        at: new Date(),
      };
    } else if (status !== 'confirmed' && currentOrder.status === 'confirmed') {
      updateData.confirmedBy = null;
    }

    if (status === 'cancelled' && currentOrder.status !== 'cancelled') {
      updateData.cancelledBy = {
        id: req.admin?.id,
        type: 'admin',
        name: actorName,
        at: new Date(),
      };
    } else if (status !== 'cancelled' && currentOrder.status === 'cancelled') {
      updateData.cancelledBy = null;
    }

    if (status === 'delivered' && currentOrder.status !== 'delivered') {
      updateData.deliveredAt = new Date();
      updateData.archivedAt = null;
    }
    if (status !== 'delivered' && currentOrder.status === 'delivered') {
      updateData.deliveredAt = null;
    }
    if (status === 'returned' && currentOrder.status !== 'returned') {
      updateData.returnedAt = new Date();
      updateData.archivedAt = null;
    }
    if (status !== 'returned' && currentOrder.status === 'returned') {
      updateData.returnedAt = null;
    }
    if (status === 'archived') {
      const archivedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        { archived: true, archivedAt: new Date() },
        { returnDocument: 'after', runValidators: true }
      )
        .lean()
        .populate('deliveryCompany', 'name abbreviation');

      if (!archivedOrder) return res.status(404).json({ error: 'Commande introuvable' });
      return res.json(archivedOrder);
    }
    if (status !== 'archived' && (currentOrder.status === 'archived' || currentOrder.archived)) {
      updateData.archived = false;
      updateData.archivedAt = null;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation');

    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    console.error('Order updateStatus error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
}

export async function reactivate(req: Request, res: Response) {
  try {
    const { removeProducts } = req.body as { removeProducts?: string[] };
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (!['cancelled', 'returned', 'delivered', 'archived'].includes(order.status)) {
      return res.status(400).json({ error: 'Statut incompatible avec la réactivation' });
    }

    let itemsToReactivate = [...order.items];

    if (removeProducts?.length) {
      itemsToReactivate = itemsToReactivate.filter(item => !removeProducts.includes(String(item.product)));
      if (itemsToReactivate.length === 0) {
        return res.status(400).json({ error: 'Tous les produits ont été retirés' });
      }
    }

    const outOfStock: { product: string; name: string; image?: string; available: number; needed: number }[] = [];
    const productMap = await findProductsByIds(itemsToReactivate.map(item => item.product));

    for (const item of itemsToReactivate) {
      const product = productMap.get(item.product);
      if (!product) {
        outOfStock.push({ product: item.product, name: item.name, available: 0, needed: item.quantity });
        continue;
      }
      if (availableStock(product, item.volume || undefined, item.color || undefined) < item.quantity) {
        outOfStock.push({ product: item.product, name: product.name, image: product.image, available: availableStock(product, item.volume || undefined, item.color || undefined), needed: item.quantity });
      }
    }

    if (outOfStock.length > 0) {
      return res.status(409).json({ error: 'Stock insuffisant', outOfStock });
    }

    if (removeProducts?.length) {
      order.items = itemsToReactivate;
      order.subtotal = itemsToReactivate.reduce((sum, item) => sum + item.price * item.quantity, 0);
      order.total = order.subtotal + order.deliveryCost;
      await order.save();
    }

    await Promise.all(itemsToReactivate.map(item => {
      const product = productMap.get(item.product);
      return product ? applyStockDelta(product, -item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
    }));

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'not_confirmed', archived: false, archivedAt: null },
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice');

    if (!updated) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(updated);
  } catch (err) {
    console.error('Order reactivate error:', err);
    res.status(500).json({ error: 'Erreur lors de la réactivation' });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Aucun identifiant fourni' });
    }
    await Order.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const { days } = req.query;
    const daysNum = days ? Number(days) : 0;
    const dateFilter: Record<string, any> = {};
    if (daysNum > 0) {
      const from = new Date();
      if (daysNum === 1) {
        from.setHours(0, 0, 0, 0);
      } else {
        from.setDate(from.getDate() - daysNum);
      }
      dateFilter.createdAt = { $gte: from };
    }

    const matchStage = Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : [];

    const [summary] = await Order.aggregate([
      ...matchStage,
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          deliveredTotal: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['delivered', 'archived']] },
                    { $ne: [{ $type: '$returnedAt' }, 'date'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          returnedCount: { $sum: { $cond: [{ $eq: [{ $type: '$returnedAt' }, 'date'] }, 1, 0] } },
          cancelledCount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'cancelled'] },
                1,
                {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', 'archived'] },
                        { $ne: [{ $type: '$returnedAt' }, 'date'] },
                        { $ne: [{ $type: '$deliveredAt' }, 'date'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              ],
            },
          },
        },
      },
    ]);

    const statusBreakdown = await Order.aggregate([
      ...matchStage,
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ordersOverTime = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          ...(Object.keys(dateFilter).length > 0 && dateFilter.createdAt ? { createdAt: { $gte: thirtyDaysAgo } } : {}),
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const bucketFormat = daysNum === 0 || daysNum >= 150 ? '%Y-%m' : daysNum > 60 ? '%G-W%V' : '%Y-%m-%d';
    const revenueOverTime = await Order.aggregate([
      ...matchStage,
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'deliverycompanies', localField: 'deliveryCompany', foreignField: '_id', as: 'company' } },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          createdAt: { $first: '$createdAt' },
          isDelivered: {
            $first: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['delivered', 'archived']] },
                    { $ne: [{ $type: '$returnedAt' }, 'date'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          isReturned: { $first: { $cond: [{ $eq: [{ $type: '$returnedAt' }, 'date'] }, 1, 0] } },
          returnPrice: { $first: { $ifNull: ['$company.returnPrice', 0] } },
          subtotal: { $first: { $ifNull: ['$subtotal', 0] } },
          cost: {
            $sum: {
              $multiply: [
                { $ifNull: [{ $ifNull: ['$items.costPrice', '$product.costPrice'] }, 0] },
                { $ifNull: ['$items.quantity', 0] },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: bucketFormat, date: '$createdAt' } },
          net: {
            $sum: {
              $subtract: [
                {
                  $cond: [
                    { $eq: ['$isDelivered', 1] },
                    { $subtract: ['$subtotal', { $ifNull: ['$cost', 0] }] },
                    0,
                  ],
                },
                {
                  $cond: [{ $eq: ['$isReturned', 1] }, { $ifNull: ['$returnPrice', 0] }, 0],
                },
              ],
            },
          },
          fees: {
            $sum: {
              $cond: [
                { $eq: ['$isReturned', 1] },
                { $ifNull: ['$returnPrice', 0] },
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const wilayaFacet = await Order.aggregate([
      ...matchStage,
      {
        $group: {
          _id: '$wilaya',
          delivered: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['delivered', 'archived']] },
                    { $ne: [{ $type: '$returnedAt' }, 'date'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          returned: { $sum: { $cond: [{ $eq: [{ $type: '$returnedAt' }, 'date'] }, 1, 0] } },
        },
      },
      {
        $facet: {
          byDelivered: [{ $sort: { delivered: -1, returned: -1 } }, { $limit: 10 }],
          byReturned: [{ $sort: { returned: -1, delivered: -1 } }, { $limit: 10 }],
        },
      },
    ]);
    const wilayaMap = new Map<string, { _id: string; delivered: number; returned: number }>();
    for (const list of [wilayaFacet[0]?.byDelivered || [], wilayaFacet[0]?.byReturned || []]) {
      for (const w of list) {
        if (!wilayaMap.has(w._id)) wilayaMap.set(w._id, w);
      }
    }
    const topWilayas = Array.from(wilayaMap.values()).sort((a, b) => b.delivered - a.delivered);

    const deliverySplit = await Order.aggregate([
      ...matchStage,
      {
        $group: {
          _id: '$deliveryMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]);

    const topProducts = await Order.aggregate([
      ...matchStage,
      { $match: { status: { $in: ['delivered', 'archived'] }, returnedAt: null } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          image: { $first: '$items.image' },
          totalQty: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderIds: { $addToSet: '$_id' },
        },
      },
      { $addFields: { orders: { $size: '$orderIds' } } },
      { $project: { orderIds: 0 } },
      { $sort: { totalQty: -1 } },
      { $limit: 10 },
    ]);

    const summaryData: Record<string, any> = summary || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0, deliveredCount: 0 };
    const shipped = (summaryData.deliveredTotal || 0) + (summaryData.returnedCount || 0);
    summaryData.shippedCount = shipped;
    summaryData.shippingRate = summaryData.totalOrders ? Math.round((shipped / summaryData.totalOrders) * 1000) / 10 : 0;
    summaryData.returnRate = shipped ? Math.round((summaryData.returnedCount / shipped) * 1000) / 10 : 0;
    summaryData.cancellationRate = summaryData.totalOrders ? Math.round((summaryData.cancelledCount / summaryData.totalOrders) * 1000) / 10 : 0;

    let avgOrdersPerDay = 0;
    if (summaryData.totalOrders > 0) {
      if (daysNum > 0) {
        avgOrdersPerDay = summaryData.totalOrders / daysNum;
      } else {
        const first = await Order.findOne().sort({ createdAt: 1 }).select('createdAt').lean();
        if (first) {
          const days = Math.max(1, Math.ceil((Date.now() - new Date(first.createdAt).getTime()) / 86400000));
          avgOrdersPerDay = summaryData.totalOrders / days;
        }
      }
    }
    summaryData.avgOrdersPerDay = Math.round(avgOrdersPerDay * 100) / 100;

    res.json({
      summary: summaryData,
      statusBreakdown,
      ordersOverTime,
      revenueOverTime,
      topWilayas,
      deliverySplit,
      topProducts,
    });
  } catch (err) {
    console.error('Order stats error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
}

export async function getMonthlyStats(_req: Request, res: Response) {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [summary] = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
          returnedCount: { $sum: { $cond: [{ $eq: [{ $type: '$returnedAt' }, 'date'] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          confirmedCount: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          shippedCount: { $sum: { $cond: [{ $eq: ['$status', 'shipped'] }, 1, 0] } },
          notConfirmedCount: { $sum: { $cond: [{ $eq: ['$status', 'not_confirmed'] }, 1, 0] } },
          soldQuantity: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, { $sum: '$items.quantity' }, 0],
            },
          },
        },
      },
    ]);

    const [profit] = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'deliverycompanies', localField: 'deliveryCompany', foreignField: '_id', as: 'company' } },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          isDelivered: {
            $first: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['delivered', 'archived']] },
                    { $ne: [{ $type: '$returnedAt' }, 'date'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          isReturned: { $first: { $cond: [{ $eq: [{ $type: '$returnedAt' }, 'date'] }, 1, 0] } },
          returnPrice: { $first: { $ifNull: ['$company.returnPrice', 0] } },
          subtotal: { $first: { $ifNull: ['$subtotal', 0] } },
          cost: {
            $sum: {
              $multiply: [
                { $ifNull: [{ $ifNull: ['$items.costPrice', '$product.costPrice'] }, 0] },
                { $ifNull: ['$items.quantity', 0] },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          net: {
            $sum: {
              $subtract: [
                { $cond: [{ $eq: ['$isDelivered', 1] }, { $subtract: ['$subtotal', '$cost'] }, 0] },
                { $cond: [{ $eq: ['$isReturned', 1] }, '$returnPrice', 0] },
              ],
            },
          },
          returnLosses: {
            $sum: { $cond: [{ $eq: ['$isReturned', 1] }, '$returnPrice', 0] },
          },
        },
      },
    ]);

    const [products] = await Product.aggregate([
      { $match: { published: { $ne: false } } },
      {
        $group: {
          _id: null,
          listed: { $sum: 1 },
          addedThisMonth: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$createdAt', start] }, { $lt: ['$createdAt', end] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const orders = summary?.orders ?? 0;

    res.json({
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      productsListed: products?.listed ?? 0,
      productsAdded: products?.addedThisMonth ?? 0,
      orders,
      revenue: Math.round(summary?.revenue ?? 0),
      avgOrderValue: orders ? Math.round((summary?.revenue ?? 0) / orders) : 0,
      netProfit: Math.round(profit?.net ?? 0),
      returnLosses: Math.round(profit?.returnLosses ?? 0),
      returnedCount: summary?.returnedCount ?? 0,
      cancelledCount: summary?.cancelledCount ?? 0,
      deliveredCount: summary?.deliveredCount ?? 0,
      confirmedCount: summary?.confirmedCount ?? 0,
      shippedCount: summary?.shippedCount ?? 0,
      notConfirmedCount: summary?.notConfirmedCount ?? 0,
      soldQuantity: summary?.soldQuantity ?? 0,
    });
  } catch (err) {
    console.error('Monthly stats error:', err);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques mensuelles' });
  }
}

export async function getDashboard(_req: Request, res: Response) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      todayResult,
      yesterdayResult,
      statusCounts,
      stockResult,
      recentOrders,
      activeWorkers,
      totalWorkers,
      hourlyActivity,
      velocityRows,
      assignedAgg,
      confirmedAgg,
      confirmedTodayAgg,
      queueAgg,
      cancelledAgg,
      workers,
      monthlyTopProducts,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: yesterdayStart, $lt: startOfDay } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Product.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            outOfStock: { $sum: { $cond: [{ $lte: [{ $ifNull: ['$stock', 0] }, 0] }, 1, 0] } },
            lowStock: { $sum: { $cond: [{ $and: [{ $gt: [{ $ifNull: ['$stock', 0] }, 0] }, { $lte: [{ $ifNull: ['$stock', 0] }, 5] }] }, 1, 0] } },
          },
        },
      ]),
      Order.find({ status: { $in: ['not_confirmed', 'confirmed', 'shipped'] } })
        .select('orderNumber firstName lastName phone wilaya commune status total createdAt')
        .lean()
        .sort({ createdAt: -1 })
        .limit(8),
      Worker.countDocuments({ active: true }),
      Worker.countDocuments(),
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            status: { $in: ['delivered', 'archived'] },
            returnedAt: null,
          },
        },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalQty: { $sum: '$items.quantity' } } },
        { $sort: { totalQty: -1 } },
        { $limit: 15 },
      ]),
      Order.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { 'confirmedBy.type': 'worker' } },
        { $group: { _id: '$confirmedBy.id', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { 'confirmedBy.type': 'worker', 'confirmedBy.at': { $gte: startOfDay } } },
        { $group: { _id: '$confirmedBy.id', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: 'not_confirmed', archived: { $ne: true }, assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { 'cancelledBy.type': 'worker' } },
        { $group: { _id: '$cancelledBy.id', total: { $sum: 1 } } },
      ]),
      Worker.find().sort({ createdAt: 1 }).select('name active frequency image').lean(),
      Order.aggregate([
        { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            orders: { $sum: 1 },
            confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
            soldQty: {
              $sum: {
                $cond: [{ $eq: ['$status', 'delivered'] }, { $ifNull: ['$items.quantity', 0] }, 0],
              },
            },
          },
        },
        { $sort: { orders: -1, soldQty: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const lowStockProducts = await Product.find({
      $or: [
        { stock: { $lte: 5 } },
        { stock: { $exists: false } },
      ],
    })
      .select('name image stock category label')
      .sort({ stock: 1 })
      .limit(8);

    const statusMap: Record<string, number> = {
      not_confirmed: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
      archived: 0,
    };
    for (const s of statusCounts) {
      if (typeof s._id === 'string' && s._id in statusMap) statusMap[s._id] = s.count;
    }

    const today = todayResult[0] || { orders: 0, revenue: 0 };
    const yesterday = yesterdayResult[0] || { orders: 0, revenue: 0 };
    const stock = stockResult[0] || { total: 0, outOfStock: 0, lowStock: 0 };

    const toMap = (rows: { _id: unknown; total: number }[]) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        if (row._id != null) map.set(String(row._id), row.total);
      }
      return map;
    };

    const assignedMap = toMap(assignedAgg);
    const confirmedMap = toMap(confirmedAgg);
    const confirmedTodayMap = toMap(confirmedTodayAgg);
    const queueMap = toMap(queueAgg);
    const cancelledMap = toMap(cancelledAgg);

    const shownWorkers = [...workers].filter(w => w.active).sort(() => Math.random() - 0.5).slice(0, 5);

    const workerStats = shownWorkers
      .map(w => {
        const assigned = assignedMap.get(String(w._id)) || 0;
        const confirmed = confirmedMap.get(String(w._id)) || 0;
        return {
          _id: String(w._id),
          name: w.name,
          active: w.active,
          frequency: w.frequency || 1,
          image: w.image,
          assigned,
          confirmed,
          cancelled: cancelledMap.get(String(w._id)) || 0,
          todayConfirmed: confirmedTodayMap.get(String(w._id)) || 0,
          queue: queueMap.get(String(w._id)) || 0,
          rate: assigned > 0 ? Math.round((confirmed / assigned) * 100) : 0,
        };
      })
      .sort((a, b) => b.todayConfirmed - a.todayConfirmed || b.confirmed - a.confirmed);

    const productMap = await findProductsByIds(velocityRows.map(r => r._id));
    const stockVelocity: {
      _id: string;
      name: string;
      image?: string;
      stock: number;
      velocity: number;
      daysLeft: number | null;
    }[] = [];
    for (const row of velocityRows) {
      const product = productMap.get(row._id);
      if (!product) continue;
      const currentStock = product.stock ?? 0;
      const perDay = row.totalQty / 30;
      const daysLeft = currentStock <= 0 ? 0 : perDay > 0 ? Math.floor(currentStock / perDay) : null;
      stockVelocity.push({
        _id: String(product._id),
        name: product.name,
        image: product.image,
        stock: currentStock,
        velocity: Math.round(perDay * 10) / 10,
        daysLeft,
      });
    }
    stockVelocity.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));

    const topProductMap = await findProductsByIds(monthlyTopProducts.map(r => r._id));
    const monthlyTopProductsList = monthlyTopProducts.map(row => {
      const product = topProductMap.get(row._id);
      return {
        _id: String(row._id),
        name: product?.name ?? 'Produit supprimé',
        image: product?.image,
        category: product?.category,
        orders: row.orders,
        confirmed: row.confirmed,
        soldQty: row.soldQty,
      };
    });

    const hourMap = new Map<number, number>();
    for (const h of hourlyActivity) hourMap.set(Number(h._id), h.count);
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap.get(h) || 0 }));

    res.json({
      today: {
        orders: today.orders || 0,
        revenue: today.revenue || 0,
        avgOrderValue: today.orders ? Math.round(today.revenue / today.orders) : 0,
      },
      yesterday: {
        orders: yesterday.orders || 0,
        revenue: yesterday.revenue || 0,
      },
      statusCounts: statusMap,
      totalOrders: Object.values(statusMap).reduce((sum, n) => sum + n, 0),
      stock,
      lowStockProducts,
      recentOrders,
      workers: { total: totalWorkers, active: activeWorkers },
      workerStats,
      hourlyActivity: hours,
      stockVelocity: stockVelocity.slice(0, 8),
      monthlyTopProducts: monthlyTopProductsList,
    });
  } catch (err) {
    console.error('Order dashboard error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du tableau de bord' });
  }
}

export async function getArchive(req: Request, res: Response) {
  try {
    await Order.updateMany(
      { status: 'archived', archived: { $ne: true } },
      [{ $set: {
        archived: true,
        archivedAt: { $ifNull: ['$archivedAt', new Date()] },
        status: {
          $cond: [
            { $eq: [{ $type: '$returnedAt' }, 'date'] }, 'returned',
            { $cond: [
              { $eq: [{ $type: '$deliveredAt' }, 'date'] }, 'delivered',
              'cancelled'
            ] }
          ]
        }
      } }]
    );

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { $or: [{ archived: true }, { status: 'archived' }] };

    const { from, to, search, status, wilaya, deliveryCompany, deliveryMethod, year, sort } = req.query;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }
    if (status && ['delivered', 'returned', 'cancelled'].includes(status as string)) {
      filter.status = status;
    }
    if (wilaya) {
      filter.wilaya = String(wilaya);
    }
    if (deliveryCompany) {
      filter.deliveryCompany = deliveryCompany;
    }
    if (deliveryMethod && ['home', 'stopdesk'].includes(deliveryMethod as string)) {
      filter.deliveryMethod = deliveryMethod;
    }
    if (search) {
      const regex = new RegExp(search as string, 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { phone: regex },
          { orderNumber: Number(search) || 0 },
        ],
      });
    }
    if (year) {
      const y = Number(year);
      if (Number.isInteger(y)) {
        const gte = new Date(y, 0, 1);
        const lt = new Date(y + 1, 0, 1);
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { archivedAt: { $gte: gte, $lt: lt } },
            { createdAt: { $gte: gte, $lt: lt } },
          ],
        });
      }
    }

    const sortOptions: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      total_desc: { total: -1 },
      total_asc: { total: 1 },
      order_desc: { orderNumber: -1 },
      order_asc: { orderNumber: 1 },
    };
    const sortBy = sortOptions[String(sort || 'newest')] || sortOptions.newest;

    const [orders, total, yearsResult] = await Promise.all([
      Order.find(filter)
        .select(ORDER_FIELDS)
        .lean()
        .populate('deliveryCompany', 'name abbreviation')
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: { $or: [{ archived: true }, { status: 'archived' }] } },
        { $project: { year: { $year: { $ifNull: ['$archivedAt', '$createdAt'] } } } },
        { $group: { _id: '$year' } },
        { $sort: { _id: -1 } },
      ]),
    ]);

    const years = yearsResult
      .map(y => Number(y._id))
      .filter(y => Number.isInteger(y));

    res.json({
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
      years,
    });
  } catch (err) {
    console.error('Order archive error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des archives' });
  }
}

export async function archiveOrders(req: Request, res: Response) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Aucun identifiant fourni' });
    }

    const result = await Order.updateMany(
      { _id: { $in: ids }, status: { $in: ['delivered', 'returned'] }, archived: { $ne: true } },
      { archived: true, archivedAt: new Date() }
    );

    res.json({ archived: result.modifiedCount, archivedAt: new Date() });
  } catch (err) {
    console.error('Order archive action error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'archivage des commandes' });
  }
}

export async function restore(req: Request, res: Response) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    if (!['cancelled', 'returned', 'delivered', 'archived'].includes(order.status)) {
      return res.status(400).json({ error: 'Statut incompatible avec la restauration' });
    }

    const productMap = await findProductsByIds(order.items.map(i => i.product));

    const outOfStock: { product: string; name: string; image?: string; available: number; needed: number }[] = [];
    for (const item of order.items) {
      const product = productMap.get(item.product);
      if (!product) {
        outOfStock.push({ product: item.product, name: item.name, available: 0, needed: item.quantity });
        continue;
      }
      if (availableStock(product, item.volume || undefined, item.color || undefined) < item.quantity) {
        outOfStock.push({ product: item.product, name: product.name, image: product.image, available: availableStock(product, item.volume || undefined, item.color || undefined), needed: item.quantity });
      }
    }

    if (outOfStock.length > 0) {
      return res.status(409).json({ error: 'Stock insuffisant', outOfStock });
    }

    await Promise.all(order.items.map(item => {
      const product = productMap.get(item.product);
      return product ? applyStockDelta(product, -item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
    }));

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'not_confirmed', archived: false, archivedAt: null },
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la restauration' });
  }
}

export async function getConfirmed(_req: Request, res: Response) {
  try {
    const orders = await Order.find({ status: 'confirmed', archived: { $ne: true } })
      .select(ORDER_FIELDS)
      .lean()
      .populate('deliveryCompany', 'name abbreviation')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes confirmées' });
  }
}

const AUTO_ARCHIVE_DAYS = 30;

export async function getReturned(_req: Request, res: Response) {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

    const toArchive = await Order.find({
      status: 'returned',
      archived: { $ne: true },
      $or: [
        { returnedAt: { $lte: cutoff } },
        { returnedAt: null, updatedAt: { $lte: cutoff } },
      ],
    }).select('_id');

    if (toArchive.length > 0) {
      await Order.updateMany(
        { _id: { $in: toArchive.map(o => o._id) } },
        { archived: true, archivedAt: now }
      );
    }

    const orders = await Order.find({
      status: 'returned',
      archived: { $ne: true },
      $or: [
        { returnedAt: { $gte: cutoff } },
        { returnedAt: null, updatedAt: { $gte: cutoff } },
        { returnedAt: null, updatedAt: null },
      ],
    })
      .select(ORDER_FIELDS)
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice')
      .sort({ returnedAt: -1, createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Order returned error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes retournées' });
  }
}

export async function getShipped(_req: Request, res: Response) {
  try {
    const orders = await Order.find({ status: 'shipped', archived: { $ne: true } })
      .select(ORDER_FIELDS)
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes expédiées' });
  }
}

export async function getDelivered(_req: Request, res: Response) {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);

    await Order.updateMany(
      { status: 'delivered', deliveredAt: { $lte: cutoff }, archived: { $ne: true } },
      { archived: true, archivedAt: now }
    );

    const orders = await Order.find({
      status: 'delivered',
      archived: { $ne: true },
      $or: [{ deliveredAt: { $gte: cutoff } }, { deliveredAt: null }],
    })
      .select(ORDER_FIELDS)
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice')
      .sort({ deliveredAt: -1 })
      .limit(100);

    res.json(orders);
  } catch (err) {
    console.error('Order delivered error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes livrées' });
  }
}

export async function returnOrder(req: Request, res: Response) {
  try {
    const { restoreItems, reason } = req.body;

    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) return res.status(404).json({ error: 'Commande introuvable' });

    if (currentOrder.status === 'returned') {
      return res.status(400).json({ error: 'La commande est déjà retournée' });
    }

    const update: Record<string, any> = {
      status: 'returned',
      returnReason: reason || '',
      stockRestored: false,
      returnedAt: new Date(),
      archivedAt: null,
    };

    if (Array.isArray(restoreItems) && restoreItems.length > 0) {
      const productMap = await findProductsByIds(restoreItems);
      await Promise.all(currentOrder.items
        .filter(item => restoreItems.includes(item.product))
        .map(item => {
          const product = productMap.get(item.product);
          return product ? applyStockDelta(product, item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
        }));
      update.stockRestored = true;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice');

    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    console.error('Order return error:', err);
    res.status(500).json({ error: 'Erreur lors du retour de la commande' });
  }
}

export async function restoreStock(req: Request, res: Response) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    if (order.status !== 'returned') {
      return res.status(400).json({ error: 'Seules les commandes retournées peuvent restituer le stock' });
    }

    if (order.stockRestored) {
      return res.status(400).json({ error: 'Le stock a déjà été restitué' });
    }

    const productMap = await findProductsByIds(order.items.map(i => i.product));
    await Promise.all(order.items.map(item => {
      const product = productMap.get(item.product);
      return product ? applyStockDelta(product, item.quantity, item.volume || undefined, item.color || undefined) : Promise.resolve();
    }));

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { stockRestored: true },
      { returnDocument: 'after', runValidators: true }
    )
      .lean()
      .populate('deliveryCompany', 'name abbreviation returnPrice');

    if (!updated) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(updated);
  } catch (err) {
    console.error('Order restoreStock error:', err);
    res.status(500).json({ error: 'Erreur lors de la restitution du stock' });
  }
}
