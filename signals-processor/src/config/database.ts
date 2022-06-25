import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createCandleModel } from '../entity/candle/model';
import { createMarketModel } from '../entity/market/model';
import { createPositionModel } from '../entity/position/model';
import { createSignalModel } from '../entity/signal/model';

export const initDb = async () => {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createPositionModel(connection);
  createCandleModel(connection);
  createMarketModel(connection);
  createSignalModel(connection);

  await connection.syncIndexes();

  console.log('MongoDB connection established');

  return connection;
};
