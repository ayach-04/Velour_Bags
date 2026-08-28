import mongoose, { Schema, Document } from 'mongoose';

export interface IWilaya extends Document {
  code: string;
  name: string;
  communes: string[];
}

const WilayaSchema = new Schema<IWilaya>({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  communes: [{ type: String }],
});

export default mongoose.model<IWilaya>('Wilaya', WilayaSchema);
