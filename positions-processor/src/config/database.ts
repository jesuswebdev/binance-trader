import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createCandleModel } from '../entity/candle/model';
import { createPositionModel } from '../entity/position/model';
import { createSignalModel } from '../entity/signal/model';
import logger from '../utils/logger';

export const initDb = async () => {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createPositionModel(connection);
  createCandleModel(connection);
  createSignalModel(connection);

  await connection.syncIndexes();

  logger.info('MongoDB connection established');

  return connection;
};
