import Wilaya from '../models/Wilaya.js';

let cache: { _id: any; code: string; name: string; communes: string[] }[] | null = null;
let codeToId: Map<string, any> | null = null;
let idToWilaya: Map<string, { _id: any; code: string; name: string; communes: string[] }> | null = null;

export async function getWilayaCache() {
  if (!cache) {
    cache = await Wilaya.find({}).select('code name communes').lean();
    codeToId = new Map(cache.map(w => [String(Number(w.code)), w._id]));
    idToWilaya = new Map(cache.map(w => [w._id.toString(), { _id: w._id, code: w.code, name: w.name, communes: w.communes }]));
  }
  return { wilayas: cache, codeToId: codeToId!, idToWilaya: idToWilaya! };
}

export function invalidateWilayaCache() {
  cache = null;
  codeToId = null;
  idToWilaya = null;
}
