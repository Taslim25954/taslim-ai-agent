import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  const uri = env.mongoUri;
  if (!uri) {
    console.log('No MongoDB URI provided, skipping DB connection');
    return;
  }

  try {
    const connection = await mongoose.connect(uri);

    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
    console.log(`📦 Database: ${connection.connection.name}`);

    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message || error);
    throw error;
  }
};
