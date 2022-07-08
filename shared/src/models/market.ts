import mongoose, { SchemaOptions } from 'mongoose';
import { numberSchemaValidation } from '../index';
import { MarketAttributes } from '../interfaces';
import { PAIRS } from '../';

export const createMarketSchema = function createMarketSchema(
  options: SchemaOptions = {},
) {
  const schema = new mongoose.Schema<MarketAttributes>(
    {
      symbol: {
        type: String,
        required: true,
        validate: (value: string) => PAIRS.map((p) => p.symbol).includes(value),
      },
      quote_asset: { type: String },
      base_asset: { type: String },
      price_tick_size: { type: Number, validate: numberSchemaValidation },
      step_size: { type: Number, validate: numberSchemaValidation },
      enabled: { type: Boolean, default: false },
      trading_enabled: { type: Boolean, default: false },
      last_price: {
        type: Number,
        validate: numberSchemaValidation,
      },
      last_trader_lock_update: { type: Number },
      trader_lock: { type: Boolean },
    },
    { timestamps: true, ...options },
  );

  schema.index({ symbol: 1 }, { unique: true });
  schema.index({ trader_lock: 1, last_trader_lock_update: 1 });

  return schema;
};
