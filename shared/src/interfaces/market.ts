import { Document, Types, LeanDocument, Model } from 'mongoose';

export interface MarketAttributes {
  base_asset: string;
  quote_asset: string;
  price_tick_size: number;
  step_size: number;
  symbol: string;
  last_price: number;
  trader_lock: boolean;
  last_trader_lock_update: number;
  /** Enabled for trading */
  enabled: boolean;
  use_test_account: boolean;
}

export interface MarketDocument extends Document, MarketAttributes {
  _id: Types.ObjectId;
}

export interface LeanMarketDocument extends LeanDocument<MarketAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface MarketModel extends Model<MarketDocument> {}
