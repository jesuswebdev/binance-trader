import { SchemaOptions, Schema } from 'mongoose';
import {
  DATABASE_MODELS,
  POSITION_SELL_TRIGGER,
  POSITION_STATUS,
} from '../constants';
import { numberSchemaValidation } from '../index';
import { PositionAttributes } from '../interfaces/position';

export function createPositionSchema(options: SchemaOptions = {}) {
  return new Schema<PositionAttributes>(
    {
      id: { type: String, required: true, unique: true },
      symbol: { type: String, required: true },
      open_time: {
        type: Number,
        required: true,
        validate: numberSchemaValidation,
      },
      close_time: { type: Number, validate: numberSchemaValidation },
      date: { type: Date },
      close_date: { type: Date },
      status: {
        type: String,
        enum: Object.values(POSITION_STATUS),
        default: POSITION_STATUS.OPEN,
      },
      change: { type: Number, validate: numberSchemaValidation },
      cost: { type: Number, validate: numberSchemaValidation },
      buy_price: { type: Number, validate: numberSchemaValidation },
      buy_amount: { type: Number, validate: numberSchemaValidation },
      sell_price: { type: Number, validate: numberSchemaValidation },
      take_profit: { type: Number, validate: numberSchemaValidation },
      stop_loss: { type: Number, validate: numberSchemaValidation },
      arm_trailing_stop_loss: {
        type: Number,
        validate: numberSchemaValidation,
      },
      trailing_stop_loss: { type: Number, validate: numberSchemaValidation },
      trailing_stop_loss_armed: { type: Boolean, default: false },
      trigger: { type: String },
      profit: { type: Number, validate: numberSchemaValidation },
      signal: { type: Schema.Types.ObjectId, ref: DATABASE_MODELS.SIGNAL },
      buy_order: { type: Object },
      sell_order: { type: Object },
      sell_trigger: {
        type: String,
        enum: Object.values(POSITION_SELL_TRIGGER),
      },
      sell_candle: { type: Object },
      account_id: {
        type: Schema.Types.ObjectId,
        ref: DATABASE_MODELS.ACCOUNT,
      },
      configuration: { type: Object },
      trailing_stop_loss_trigger_time: { type: Number },
      stop_loss_trigger_time: { type: Number },
      take_profit_trigger_time: { type: Number },
      last_tsl_update: { type: Number, default: 0 },
      trader_lock: { type: Boolean, default: false },
      filled_on_update: { type: Boolean, default: false },
      negative_change: { type: Boolean, default: false },
      unlocked_tsl_multiplier: { type: Number, default: 0 },
      last_stop_loss_update: { type: Number, default: 0 },
      broadcast: { type: Boolean, default: false },
      entry_signal_telegram_message_id: { type: Number },
      entry_signal_discord_message_id: { type: Number },
    },
    { timestamps: true, ...options },
  )
    .index({ 'buy_order.orderId': 1 })
    .index({ 'sell_order.orderId': 1 })
    .index({ symbol: 1, status: 1 })
    .index({ status: 1, close_time: 1 })
    .index({ symbol: 1, status: 1, open_time: -1 })
    .index({ id: 1, signal: 1 })
    .index({ id: 1, 'buy_order.orderId': 1 });
}
