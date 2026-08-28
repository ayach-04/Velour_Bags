import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPriceEntry {
  wilaya: Types.ObjectId;
  homeDelivery: number | null;
  stopDesk: number | null;
  returnFee: number | null;
}

export interface IDeliveryCompany extends Document {
  name: string;
  logo?: string;
  location: string;
  notes?: string;
  abbreviation?: string;
  isActive: boolean;
  isDefault: boolean;
  returnPrice: number | null;
  prices: IPriceEntry[];
}

const PriceEntrySchema = new Schema<IPriceEntry>({
  wilaya: { type: Schema.Types.ObjectId, ref: 'Wilaya', required: true },
  homeDelivery: { type: Number, default: null },
  stopDesk: { type: Number, default: null },
  returnFee: { type: Number, default: null },
}, { _id: false });

const DeliveryCompanySchema = new Schema<IDeliveryCompany>({
  name: { type: String, required: true },
  logo: { type: String },
  location: { type: String, required: true },
  notes: { type: String },
  abbreviation: { type: String },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  returnPrice: { type: Number, default: null },
  prices: [PriceEntrySchema],
});

DeliveryCompanySchema.index({ name: 1 });
DeliveryCompanySchema.index({ 'prices.wilaya': 1 });

export default mongoose.model<IDeliveryCompany>('DeliveryCompany', DeliveryCompanySchema);
