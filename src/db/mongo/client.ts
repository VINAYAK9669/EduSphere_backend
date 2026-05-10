import mongoose from 'mongoose';
import logger from '../../lib/logger';

export async function connectMongo(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI!);
  logger.info('MongoDB connected');
}
