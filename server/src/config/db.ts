import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI!;
if (!MONGO_URI) throw new Error('MONGO_URI is not set in environment variables');

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    const dbName = MONGO_URI.split('/').pop()?.split('?')[0] || 'unknown';
    console.log(`MongoDB connected to database: ${dbName}`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}
