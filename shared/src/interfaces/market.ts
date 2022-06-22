export interface MarketAttributes {
  id: number;
  base_asset: string;
  quote_asset: string;
  price_tick_size: number;
  step_size: number;
  symbol: string;
  last_price: number;
  trader_lock: boolean;
  last_trader_lock_update: number;
  enabled: boolean;
  use_test_account: boolean;
}
