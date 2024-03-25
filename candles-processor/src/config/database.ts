import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createCandleModel } from '../entity/candle/model';
import { createMarketModel } from '../entity/market/model';
import logger from '../utils/logger';

export async function initDb() {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createMarketModel(connection);
  createCandleModel(connection);

  await connection.syncIndexes();

  logger.info('MongoDB connection established');

  return connection;
}
