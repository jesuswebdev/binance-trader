import mongoose, { SchemaOptions } from 'mongoose';
import { numberSchemaValidation, getTimeDiff } from '../index';
import { CandleAttributes } from '../interfaces/candle';
import { PAIRS } from '../';

export const createCandleSchema = function createCandleSchema(
  options: SchemaOptions = {},
) {
  const schema = new mongoose.Schema<CandleAttributes>(
    {
      id: { type: String, required: true, index: true },
      symbol: {
        type: String,
        required: true,
        validate: (value: string) =>
          PAIRS.map((pair) => pair.symbol).includes(value),
      },
      open_time: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      close_time: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      interval: {
        type: String,
        required: true,
        validate: (value: string) =>
          value.match(new RegExp('^[\\d]{1,2}(d|h|m)$')),
      },
      open_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      close_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      high_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      low_price: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      base_asset_volume: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      quote_asset_volume: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      macd: { type: Number, validate: numberSchemaValidation },
      macd_signal: { type: Number, validate: numberSchemaValidation },
      macd_histogram: { type: Number, validate: numberSchemaValidation },
      date: { type: String, required: true },
      mama: { type: Number, validate: numberSchemaValidation },
      fama: { type: Number, validate: numberSchemaValidation },
      atr: { type: Number, validate: numberSchemaValidation },
      atr_stop: { type: Number, validate: numberSchemaValidation },
      atr_sma: { type: Number, validate: numberSchemaValidation },
      event_time: { type: Number, validate: numberSchemaValidation },
      trend: { type: Number, enum: [1, -1], validate: numberSchemaValidation },
      trend_up: { type: Number, validate: numberSchemaValidation },
      trend_down: { type: Number, validate: numberSchemaValidation },
      adx: { type: Number, validate: numberSchemaValidation },
      plus_di: { type: Number, validate: numberSchemaValidation },
      minus_di: { type: Number, validate: numberSchemaValidation },
      obv: { type: Number, validate: numberSchemaValidation },
      obv_ema: { type: Number, validate: numberSchemaValidation },
      ch_atr: { type: Number, validate: numberSchemaValidation },
      ch_atr_ema: { type: Number, validate: numberSchemaValidation },
      ema_50: { type: Number, validate: numberSchemaValidation },
      is_pump: { type: Boolean, default: false },
      is_dump: { type: Boolean, default: false },
      volume_trend: {
        type: Number,
        enum: [1, -1],
        validate: numberSchemaValidation,
      },
      ema_50_slope: {
        type: Number,
        enum: [1, -1],
        validate: numberSchemaValidation,
      },
      ha_open: { type: Number, validate: numberSchemaValidation },
      ha_close: { type: Number, validate: numberSchemaValidation },
      ha_high: { type: Number, validate: numberSchemaValidation },
      ha_low: { type: Number, validate: numberSchemaValidation },
    },
    { timestamps: true, ...options },
  );

  schema.index({ symbol: 1, open_time: 1 });
  schema.index({ symbol: 1, interval: 1, open_time: 1 });
  schema.index({ symbol: 1, interval: 1, open_time: -1 });
  schema.index(
    { createdAt: 1 },
    { expires: getTimeDiff(180, process.env.CANDLE_INTERVAL ?? '') / 1000 },
  );

  return schema;
};
