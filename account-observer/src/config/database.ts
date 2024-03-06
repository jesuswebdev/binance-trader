import mongoose from 'mongoose';
import { DATABASE_URI } from '.';
import { createAccountModel } from '../entity/account/model';
import { createOrderModel } from '../entity/order/model';
import logger from '../utils/logger';

export const initDb = async () => {
  const connection = await mongoose
    .createConnection(DATABASE_URI, { authSource: 'admin' })
    .asPromise();

  createAccountModel(connection);
  createOrderModel(connection);

  await connection.syncIndexes();

  logger.info('MongoDB connection established');

  return connection;
};
