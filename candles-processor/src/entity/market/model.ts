import { Connection } from 'mongoose';
import { createMarketSchema, DATABASE_MODELS } from '@binance-trader/shared';

export function createMarketModel(connection: Connection) {
  connection.model(DATABASE_MODELS.MARKET, createMarketSchema());
}
