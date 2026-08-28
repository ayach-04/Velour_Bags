import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrderItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  volume?: string;
  color?: string;
  colorImage?: string;
  costPrice?: number;
}

export interface IOrderHistory {
  status: string;
  byType: 'admin' | 'worker';
  byId: Types.ObjectId | string;
  byName: string;
  at: Date;
}

export interface IConfirmedBy {
  id: Types.ObjectId | string;
  type: 'admin' | 'worker';
  name: string;
  at: Date;
}

export interface IOrder extends Document {
  orderNumber: number;
  firstName: string;
  lastName: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  orderNote?: string;
  items: IOrderItem[];
  subtotal: number;
  deliveryCompany?: Types.ObjectId;
  deliveryMethod: 'home' | 'stopdesk' | null;
  deliveryCost: number;
  total: number;
  status: 'not_confirmed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'archived' | 'returned';
  returnReason?: string;
  stockRestored: boolean;
  archived: boolean;
  deliveredAt?: Date;
  returnedAt?: Date;
  archivedAt?: Date;
  history: IOrderHistory[];
  confirmedBy?: IConfirmedBy | null;
  cancelledBy?: IConfirmedBy | null;
  assignedTo?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String, default: '' },
  volume: { type: String, default: '' },
  color: { type: String, default: '' },
  colorImage: { type: String, default: '' },
  costPrice: { type: Number, default: 0 },
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: Number, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, default: '' },
  phone: { type: String, required: true },
  wilaya: { type: String, required: true },
  commune: { type: String, default: '' },
  address: { type: String, default: '' },
  orderNote: { type: String, default: '' },
  items: [OrderItemSchema],
  subtotal: { type: Number, required: true },
  deliveryCompany: { type: Schema.Types.ObjectId, ref: 'DeliveryCompany' },
  deliveryMethod: { type: String, enum: ['home', 'stopdesk'], default: null },
  deliveryCost: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { type: String, enum: ['not_confirmed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'archived', 'returned'], default: 'not_confirmed' },
  returnReason: { type: String, default: '' },
  stockRestored: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  deliveredAt: { type: Date, default: null },
  returnedAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },
  history: [
    {
      status: String,
      byType: { type: String, enum: ['admin', 'worker'], default: 'admin' },
      byId: Schema.Types.ObjectId,
      byName: String,
      at: { type: Date, default: Date.now },
      _id: false,
    },
  ],
  confirmedBy: {
    id: Schema.Types.ObjectId,
    type: { type: String, enum: ['admin', 'worker'], default: 'admin' },
    name: String,
    at: Date,
    _id: false,
  },
  cancelledBy: {
    id: Schema.Types.ObjectId,
    type: { type: String, enum: ['admin', 'worker'], default: 'admin' },
    name: String,
    at: Date,
    _id: false,
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Worker', default: null },
}, { timestamps: true });

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ status: 1, deliveredAt: -1 });
OrderSchema.index({ status: 1, returnedAt: -1 });
OrderSchema.index({ assignedTo: 1, status: 1 });

OrderSchema.pre('save', async function() {
  if (this.isNew && !this.orderNumber) {
    const last = await mongoose.model('Order').findOne().sort({ orderNumber: -1 });
    this.orderNumber = (last?.orderNumber || 0) + 1;
  }
});

export default mongoose.model<IOrder>('Order', OrderSchema);
