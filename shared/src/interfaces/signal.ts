import { LeanDocument, Model, Types } from 'mongoose';
import { PositionStatus, SignalTypes } from '../constants';

export interface SignalAttributes {
  id: string;
  time: number;
  trigger_time: number;
  close_time: number;
  symbol: string;
  interval: string;
  price: number;
  type: SignalTypes;
  date: Date;
  close_date: Date;
  drop_price: number;
  trigger: string;
  status: PositionStatus;
  trailing_stop_buy: number;
  //eslint-disable-next-line
  open_candle: Record<string, any>;
  //eslint-disable-next-line
  close_candle: Record<string, any>;
  drop_percent: number;
  position: Types.ObjectId;
  broadcast: boolean;
  trader_lock: boolean;
}

export interface SignalDocument extends Document, SignalAttributes {
  _id: Types.ObjectId;
}

export interface LeanSignalDocument extends LeanDocument<SignalAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface SignalModel extends Model<SignalDocument> {}
