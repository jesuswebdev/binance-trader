import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createCandleModel } from '../entity/candle/model';
import { createMarketModel } from '../entity/market/model';

export const initDb = async () => {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createMarketModel(connection);
  createCandleModel(connection);

  await connection.syncIndexes();

  console.log('MongoDB connection established');

  return connection;
};
