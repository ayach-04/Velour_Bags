import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Wilaya from './models/Wilaya.js';
import wilayaData from './data/wilayas.js';
import DeliveryCompany from './models/DeliveryCompany.js';
import Admin from './models/Admin.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;
if (!MONGO_URI) throw new Error('MONGO_URI is not set in environment variables');

const deliveryPriceData: { wilayaCode: string; homeDelivery: number | null; stopDesk: number | null }[] = [
  { wilayaCode: '31', homeDelivery: 500, stopDesk: 250 },
  { wilayaCode: '27', homeDelivery: 700, stopDesk: 300 },
  { wilayaCode: '16', homeDelivery: 700, stopDesk: 300 },
  { wilayaCode: '46', homeDelivery: 800, stopDesk: 300 },
  { wilayaCode: '44', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '05', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '06', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '09', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '34', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '10', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '35', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '02', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '26', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '43', homeDelivery: 800, stopDesk: null },
  { wilayaCode: '21', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '28', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '25', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '04', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '19', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '42', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '15', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '29', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '48', homeDelivery: 800, stopDesk: null },
  { wilayaCode: '22', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '20', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '14', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '13', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '23', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '18', homeDelivery: 800, stopDesk: 350 },
  { wilayaCode: '38', homeDelivery: 800, stopDesk: null },
  { wilayaCode: '40', homeDelivery: 850, stopDesk: 350 },
  { wilayaCode: '36', homeDelivery: 900, stopDesk: null },
  { wilayaCode: '24', homeDelivery: 900, stopDesk: 400 },
  { wilayaCode: '41', homeDelivery: 900, stopDesk: null },
  { wilayaCode: '12', homeDelivery: 900, stopDesk: 400 },
  { wilayaCode: '07', homeDelivery: 1000, stopDesk: 500 },
  { wilayaCode: '51', homeDelivery: 1000, stopDesk: null },
  { wilayaCode: '17', homeDelivery: 1000, stopDesk: 500 },
  { wilayaCode: '03', homeDelivery: 1000, stopDesk: 500 },
  { wilayaCode: '39', homeDelivery: 1100, stopDesk: null },
  { wilayaCode: '57', homeDelivery: 1100, stopDesk: null },
  { wilayaCode: '47', homeDelivery: 1100, stopDesk: 500 },
  { wilayaCode: '58', homeDelivery: 1100, stopDesk: null },
  { wilayaCode: '30', homeDelivery: 1100, stopDesk: 500 },
  { wilayaCode: '55', homeDelivery: 1100, stopDesk: 500 },
  { wilayaCode: '08', homeDelivery: 1200, stopDesk: 600 },
  { wilayaCode: '52', homeDelivery: 1200, stopDesk: null },
  { wilayaCode: '32', homeDelivery: 1200, stopDesk: null },
  { wilayaCode: '45', homeDelivery: 1200, stopDesk: 600 },
  { wilayaCode: '01', homeDelivery: 1500, stopDesk: 750 },
  { wilayaCode: '49', homeDelivery: 1500, stopDesk: null },
  { wilayaCode: '37', homeDelivery: 1500, stopDesk: null },
  { wilayaCode: '53', homeDelivery: 1850, stopDesk: null },
  { wilayaCode: '11', homeDelivery: 2000, stopDesk: 1000 },
  { wilayaCode: '33', homeDelivery: 2000, stopDesk: null },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    await Wilaya.deleteMany({});
    const createdWilayas = await Wilaya.insertMany(wilayaData);
    console.log(`${createdWilayas.length} wilayas seeded`);

    const wilayaMap = new Map(createdWilayas.map(w => [w.code, w._id]));

    await DeliveryCompany.deleteMany({});
    await DeliveryCompany.create({
      name: 'Nord et Ouest Express',
      logo: '',
      abbreviation: 'Noest',
      location: '31',
      isActive: true,
      notes: 'Les tarifs sont applicables pour un poids de 0,5 Kg à 5 Kg\nAu-delà de 5 Kg : 40 DA HT pour tout Kg supplémentaire\nLes envois non livrés (retour) : Les retours sont à 300 DA',
      prices: deliveryPriceData.map(p => ({
        wilaya: wilayaMap.get(p.wilayaCode),
        homeDelivery: p.homeDelivery,
        stopDesk: p.stopDesk,
      })),
    });
    console.log('1 delivery company seeded');

    const existingAdmin = await Admin.findOne({ email: 'admin@velour.dz' });
    if (!existingAdmin) {
      await Admin.create({
        email: 'admin@velour.dz',
        password: 'admin123',
        name: 'Admin',
        role: 'admin',
      });
      console.log('Admin seeded: admin@velour.dz / admin123');
    } else {
      console.log('Admin already exists, skipping');
    }

    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
