import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createMarketModel } from '../entity/market/model';

export const initDb = async () => {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createMarketModel(connection);

  await connection.syncIndexes();

  return connection;
};
