import { Connection } from 'mongoose';
import { createCandleSchema, DATABASE_MODELS } from '@binance-trader/shared';

export function createCandleModel(connection: Connection) {
  connection.model(DATABASE_MODELS.CANDLE, createCandleSchema());
}
