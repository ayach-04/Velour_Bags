import mongoose, { Schema, Document } from 'mongoose';

export interface IVolume {
  label: string;
  price: number;
  costPrice?: number;
  stock?: number;
  oldPrice?: number;
}

export interface IColor {
  name: string;
  price: number;
  costPrice?: number;
  stock?: number;
  oldPrice?: number;
  image: string;
  images?: string[];
}

export interface IProduct extends Document {
  id?: number;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  oldPrice?: number;
  image: string;
  images?: string[];
  label?: 'NEW' | 'PROMO' | 'OUT_OF_STOCK';
  description?: string;
  benefits?: string[];
  howToUse?: string;
  ingredients?: string;
  volume?: string;
  brand?: string;
  stock?: number;
  volumes?: IVolume[];
  colors?: IColor[];
  published?: boolean;
  createdAt: Date;
}

const VolumeSchema = new Schema<IVolume>({
  label: { type: String, required: true },
  price: { type: Number, required: true },
  costPrice: Number,
  stock: { type: Number, default: 0 },
  oldPrice: Number,
}, { _id: false });

const ColorSchema = new Schema<IColor>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  costPrice: Number,
  stock: { type: Number, default: 0 },
  oldPrice: Number,
  image: { type: String, required: true },
  images: [String],
}, { _id: false });

const ProductSchema = new Schema<IProduct>({
  id: { type: Number, unique: true, sparse: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  costPrice: Number,
  oldPrice: Number,
  image: { type: String, required: true },
  images: [String],
  label: { type: String, enum: ['NEW', 'PROMO', 'OUT_OF_STOCK'] },
  description: String,
  benefits: [String],
  howToUse: String,
  ingredients: String,
  volume: String,
  brand: String,
  stock: { type: Number, default: 0 },
  volumes: { type: [VolumeSchema], default: undefined },
  colors: { type: [ColorSchema], default: undefined },
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, {
  toJSON: { virtuals: false },
  toObject: { virtuals: false },
});

export default mongoose.model<IProduct>('Product', ProductSchema);
