import { Connection } from 'mongoose';
import { createPositionSchema, DATABASE_MODELS } from '@binance-trader/shared';

const schema = createPositionSchema();

export function createPositionModel(connection: Connection) {
  connection.model(DATABASE_MODELS.POSITION, schema);
}
