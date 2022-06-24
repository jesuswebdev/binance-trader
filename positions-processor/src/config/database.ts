import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createCandleModel } from '../entity/candle/model';
import { createPositionModel } from '../entity/position/model';

export const initDb = async () => {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createPositionModel(connection);
  createCandleModel(connection);

  await connection.syncIndexes();

  console.log('MongoDB connection established');

  return connection;
};
