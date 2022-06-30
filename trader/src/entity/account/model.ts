import { Connection } from 'mongoose';
import { createAccountSchema, DATABASE_MODELS } from '@binance-trader/shared';

const schema = createAccountSchema();

export function createAccountModel(connection: Connection) {
  connection.model(DATABASE_MODELS.ACCOUNT, schema);
}
