import { Document, Types, LeanDocument, Model } from 'mongoose';

export interface CandleTickData {
  id: string;
  symbol: string;
  event_time: number;
  open_time: number;
  close_time: number;
  interval: string;
  open_price: number;
  close_price: number;
  high_price: number;
  low_price: number;
  base_asset_volume: number;
  quote_asset_volume: number;
  date: string;
}

export interface CandleAttributes extends CandleTickData {
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  mama: number;
  fama: number;
  atr: number;
  atr_stop: number;
  atr_sma: number;
  trend: number;
  trend_up: number;
  trend_down: number;
  adx: number;
  plus_di: number;
  minus_di: number;
  obv: number;
  obv_ema: number;
  ch_atr: number;
  ch_atr_ema: number;
  ema_50: number;
  is_pump: boolean;
  is_dump: boolean;
  volume_trend: number;
  ema_50_slope: number;
}

export interface CandleDocument extends Document, CandleAttributes {
  id: string;
  _id: Types.ObjectId;
}

export interface LeanCandleDocument extends LeanDocument<CandleAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface CandleModel extends Model<CandleDocument> {}
