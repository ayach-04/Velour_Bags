import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IWorker extends Document {
  name: string;
  email: string;
  username?: string;
  phone?: string;
  password: string;
  image: string;
  active: boolean;
  frequency: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const WorkerSchema = new Schema<IWorker>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  image: { type: String, default: '' },
  active: { type: Boolean, default: true },
  frequency: { type: Number, default: 1, min: 1, max: 99 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: { type: Date, default: Date.now },
});

WorkerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

WorkerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IWorker>('Worker', WorkerSchema);
