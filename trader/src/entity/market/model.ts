import { Connection } from 'mongoose';
import { createMarketSchema, DATABASE_MODELS } from '@binance-trader/shared';

const schema = createMarketSchema();

export function createMarketModel(connection: Connection) {
  connection.model(DATABASE_MODELS.MARKET, schema);
}
