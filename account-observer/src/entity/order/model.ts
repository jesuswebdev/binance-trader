import { Connection } from 'mongoose';
import { createOrderSchema, DATABASE_MODELS } from '@binance-trader/shared';

const schema = createOrderSchema();

export function createOrderModel(connection: Connection) {
  connection.model(DATABASE_MODELS.ORDER, schema);
}
