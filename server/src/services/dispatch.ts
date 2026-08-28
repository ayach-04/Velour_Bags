import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Worker from '../models/Worker.js';

const FREQ_MIN = 1;
const FREQ_MAX = 99;

export function normalizeFrequency(freq: unknown): number {
  const f = Math.floor(Number(freq));
  return Number.isInteger(f) ? Math.min(FREQ_MAX, Math.max(FREQ_MIN, f)) : FREQ_MIN;
}

export async function getActiveWorkers() {
  return Worker.find({ active: true }).sort({ createdAt: 1 }).select('_id name frequency').lean();
}

// Répartition par roulement : chaque employé reçoit sa propre fréquence de
// commandes consécutives avant de passer au suivant.
// Ex: E1=1, E2=1, E3=1, E4=1 => cde 1,5 -> E1 ; 2,6 -> E2 ; 3 -> E3 ; 4 -> E4
export async function assignOrdersToWorkers(
  orders: { _id: mongoose.Types.ObjectId | string }[],
  workers: { _id: mongoose.Types.ObjectId | string; name: string; frequency?: number }[]
): Promise<number> {
  if (!workers.length || !orders.length) return 0;

  let wi = 0;
  let remaining = Math.max(FREQ_MIN, workers[0]?.frequency || FREQ_MIN);

  const operations = orders.map(order => {
    const worker = workers[wi];
    const op = {
      updateOne: {
        filter: { _id: order._id },
        update: { $set: { assignedTo: worker._id as unknown as mongoose.Types.ObjectId } },
      },
    };
    remaining -= 1;
    if (remaining <= 0) {
      wi = (wi + 1) % workers.length;
      remaining = Math.max(FREQ_MIN, workers[wi]?.frequency || FREQ_MIN);
    }
    return op;
  });

  await Order.bulkWrite(operations);
  return operations.length;
}

export async function dispatchNewOrder(orderId: mongoose.Types.ObjectId | string): Promise<void> {
  const workers = await getActiveWorkers();
  if (!workers.length) return;

  const frequencies = workers.map(w => Math.max(FREQ_MIN, w.frequency || FREQ_MIN));
  const cycle = frequencies.reduce((sum, f) => sum + f, 0);

  const assignedCount = await Order.countDocuments({ assignedTo: { $ne: null } });
  let pos = assignedCount % cycle;

  let worker = workers[0];
  for (let i = 0; i < workers.length; i++) {
    if (pos < frequencies[i]) {
      worker = workers[i];
      break;
    }
    pos -= frequencies[i];
  }

  await Order.findByIdAndUpdate(orderId, { $set: { assignedTo: worker._id } });
}

export async function runDispatch(): Promise<number> {
  const [workers, orders] = await Promise.all([
    getActiveWorkers(),
    Order.find({ status: 'not_confirmed' }).sort({ createdAt: 1 }).select('_id').lean(),
  ]);

  return assignOrdersToWorkers(orders, workers);
}
