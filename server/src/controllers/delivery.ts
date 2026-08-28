import { Request, Response } from 'express';
import DeliveryCompany from '../models/DeliveryCompany.js';
import { getWilayaCache } from '../utils/wilayaCache.js';

export async function getAll(_req: Request, res: Response) {
  try {
    const [companies, { idToWilaya: map }] = await Promise.all([
      DeliveryCompany.find().select('name logo location notes abbreviation isActive isDefault returnPrice prices').lean(),
      getWilayaCache(),
    ]);
    const result = companies.map(c => {
      c.prices = c.prices.map((p: any) => ({ ...p, wilaya: map.get(p.wilaya.toString()) }));
      return { ...c, isActive: c.isActive !== false };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des transporteurs' });
  }
}

export async function getOne(req: Request, res: Response) {
  try {
    const company = await DeliveryCompany.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ error: 'Transporteur introuvable' });
    const { idToWilaya: map } = await getWilayaCache();
    company.prices = company.prices.map((p: any) => ({ ...p, wilaya: map.get(p.wilaya.toString()) }));
    res.json({ ...company, isActive: company.isActive !== false });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération du transporteur' });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const { name, logo, location, notes, abbreviation, isActive, returnPrice, prices } = req.body;
    const { codeToId: c2i, idToWilaya: map } = await getWilayaCache();
    const mappedPrices = (prices || []).map((p: any) => ({
      wilaya: c2i.get(p.wilayaCode),
      homeDelivery: p.homeDelivery ?? null,
      stopDesk: p.stopDesk ?? null,
      returnFee: p.returnFee ?? null,
    }));
    const company = await DeliveryCompany.create({ name, logo, location, notes, abbreviation, isActive, returnPrice: returnPrice ?? null, prices: mappedPrices });

    const count = await DeliveryCompany.countDocuments();
    if (count === 1) {
      company.isDefault = true;
      await company.save();
    }

    const result = company.toObject();
    result.prices = result.prices.map((p: any) => ({ ...p, wilaya: map.get(p.wilaya.toString()) }));
    res.status(201).json(result);
  } catch (err: any) {
    console.error('Create delivery error:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Ce transporteur existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du transporteur', detail: (err as Error).message });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { name, logo, location, notes, abbreviation, isActive, returnPrice, prices } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (abbreviation !== undefined) updateData.abbreviation = abbreviation;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (returnPrice !== undefined) updateData.returnPrice = returnPrice;
    const { codeToId: c2i, idToWilaya: map } = await getWilayaCache();
    if (prices !== undefined) {
      updateData.prices = prices.map((p: any) => ({
        wilaya: c2i.get(p.wilayaCode),
        homeDelivery: p.homeDelivery ?? null,
        stopDesk: p.stopDesk ?? null,
        returnFee: p.returnFee ?? null,
      }));
    }

    const company = await DeliveryCompany.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: true });
    if (!company) return res.status(404).json({ error: 'Transporteur introuvable' });
    const result = company.toObject();
    result.prices = result.prices.map((p: any) => ({ ...p, wilaya: map.get(p.wilaya.toString()) }));
    res.json(result);
  } catch (err: any) {
    console.error('Update delivery error:', err);
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Ce transporteur existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du transporteur', detail: (err as Error).message });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const company = await DeliveryCompany.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ error: 'Transporteur introuvable' });
    res.json({ message: 'Transporteur supprimé' });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la suppression du transporteur' });
  }
}

export async function importPrices(req: Request, res: Response) {
  try {
    const { companyId, prices } = req.body;
    if (!companyId || !Array.isArray(prices)) {
      return res.status(400).json({ error: 'companyId et prices requis' });
    }

    const { codeToId: c2i, idToWilaya: map } = await getWilayaCache();

    const validPrices = prices
      .filter((p: any) => c2i.has(p.wilayaCode))
      .map((p: any) => ({
        wilaya: c2i.get(p.wilayaCode),
        homeDelivery: p.homeDelivery ?? null,
        stopDesk: p.stopDesk ?? null,
        returnFee: null,
      }));

    const invalid = prices.filter((p: any) => !c2i.has(p.wilayaCode));
    if (invalid.length > 0) {
      console.warn(`Ignored ${invalid.length} invalid wilaya codes in import`);
    }

    const company = await DeliveryCompany.findByIdAndUpdate(
      companyId,
      { $set: { prices: validPrices } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!company) return res.status(404).json({ error: 'Transporteur introuvable' });
    const result = company.toObject();
    result.prices = result.prices.map((p: any) => ({ ...p, wilaya: map.get(p.wilaya.toString()) }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de l\'import des prix' });
  }
}

export async function setDefault(req: Request, res: Response) {
  try {
    const company = await DeliveryCompany.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Transporteur introuvable' });

    await DeliveryCompany.updateMany({ _id: { $ne: company._id } }, { isDefault: false });
    company.isDefault = true;
    await company.save();

    res.json({ message: 'Transporteur par défaut défini' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la définition du transporteur par défaut' });
  }
}

export async function getDefault(_req: Request, res: Response) {
  try {
    const company = await DeliveryCompany.findOne({ isDefault: true }).lean();
    if (!company) {
      const first = await DeliveryCompany.findOne().sort({ createdAt: 1 }).lean();
      return res.json(first || null);
    }
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération du transporteur par défaut' });
  }
}
