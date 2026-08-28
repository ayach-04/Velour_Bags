import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import adminRoutes from './routes/admin.js';
import workerRoutes from './routes/worker.js';
import uploadRoutes from './routes/upload.js';
import productRoutes from './routes/products.js';
import brandRoutes from './routes/brands.js';
import categoryRoutes from './routes/categories.js';
import wilayaRoutes from './routes/wilayas.js';
import deliveryRoutes from './routes/delivery.js';
import orderRoutes from './routes/order.js';
import Product from './models/Product.js';
import { initTransporter } from './utils/email.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/admin', adminRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/wilayas', wilayaRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/orders', orderRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'Skincare API' });
});

async function migrateProductIds() {
  try {
    const missing = await Product.find({ id: { $exists: false } });
    if (missing.length === 0) return;
    const last = await Product.findOne().sort({ id: -1 });
    let nextId = (last?.id || 0) + 1;
    for (const product of missing) {
      await Product.updateOne({ _id: product._id }, { $set: { id: nextId++ } });
    }
    console.log(`Assigned numeric ids to ${missing.length} products`);
  } catch (err) {
    console.error('Failed to migrate product ids:', err);
  }
}

async function start() {
  await connectDB();
  await migrateProductIds();
  initTransporter();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

start();
