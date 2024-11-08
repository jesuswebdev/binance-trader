import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createAccountModel } from '../entity/account/model';
import { createMarketModel } from '../entity/market/model';
import { createOrderModel } from '../entity/order/model';
import { createPositionModel } from '../entity/position/model';

export const initDb = async () => {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createAccountModel(connection);
  createPositionModel(connection);
  createMarketModel(connection);
  createOrderModel(connection);

  await connection.syncIndexes();

  console.log('MongoDB connection established');

  return connection;
};
