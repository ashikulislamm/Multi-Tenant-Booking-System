import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';
let mongod: MongoMemoryServer | null = null;
export const connectDB = async (): Promise<void> => {
  try {
    let uri = env.MONGODB_URI;
    // Fallback to MongoMemoryServer for development and test if URI is absent or is a placeholder
    if (!uri || uri.includes('<db_password>')) {
      console.log('⚠️ MONGODB_URI not provided or placeholder detected. Launching local in-memory MongoDB...');
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log(`🚀 In-memory MongoDB listening at: ${uri}`);
    }
    await mongoose.connect(uri);
    console.log('🔌 MongoDB connected successfully.');
  } catch (error) {
    console.error('❌ MongoDB connection failure:', error);
    process.exit(1);
  }
};
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      console.log('🛑 Local in-memory MongoDB stopped.');
    }
    console.log('🔌 MongoDB disconnected.');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
};