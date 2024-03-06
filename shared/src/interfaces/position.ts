import { LeanDocument, Model, Types } from 'mongoose';
import { PositionSellTrigger, PositionStatus } from '../constants';

export interface PositionAttributes {
  id: string;
  symbol: string;
  open_time: number;
  close_time: number;
  date: Date;
  close_date: Date;
  status: PositionStatus;
  change: number;
  cost: number;
  buy_price: number;
  buy_amount: number;
  sell_price: number;
  take_profit: number;
  stop_loss: number;
  arm_trailing_stop_loss: number;
  trailing_stop_loss: number;
  trailing_stop_loss_armed: boolean;
  trigger: string;
  profit: number;
  signal: Types.ObjectId;
  //eslint-disable-next-line
  buy_order: Record<string, any>;
  //eslint-disable-next-line
  sell_order: Record<string, any>;
  sell_trigger: PositionSellTrigger;
  //eslint-disable-next-line
  sell_candle: Record<string, any>;
  account_id: Types.ObjectId;
  //eslint-disable-next-line
  configuration: Record<string, any>;
  trailing_stop_loss_trigger_time: number;
  stop_loss_trigger_time: number;
  take_profit_trigger_time: number;
  last_tsl_update: number;
  trader_lock: boolean;
  filled_on_update: boolean;
  negative_change: boolean;
  unlocked_tsl_multiplier: number;
  last_stop_loss_update: number;
  broadcast: boolean;
  entry_signal_telegram_message_id: number;
  entry_signal_discord_message_id: number;
}

export interface PositionDocument extends Document, PositionAttributes {
  _id: Types.ObjectId;
}

export interface LeanPositionDocument extends LeanDocument<PositionAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface PositionModel extends Model<PositionDocument> {}
