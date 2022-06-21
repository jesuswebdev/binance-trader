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
  amplitude: number; //not used
  change: number;
  rsi: number;
  will_r: number; //not used i believe
  ema: number;
  bbands_upper: number;
  bbands_middle: number;
  bbands_lower: number;
  bbands_direction: string;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  parabolic_sar: number; // not used
  mama: number;
  fama: number;
  atr: number;
  atr_stop: number;
  atr_sma: number;
  ema_7: number;
  ema_25: number;
  ema_100: number;
  volume_sma: number;
  stoch_rsi_k: number;
  stoch_rsi_d: number;
  trend: number;
  trend_up: number;
  trend_down: number;
  adx: number;
  plus_di: number;
  minus_di: number;
  obv: number;
  obv_ema: number;
  sma_50: number;
  sma_100: number;
  sma_200: number;
  ch_atr: number;
  ch_atr_ema: number;
  ema_50: number;
  is_pump: boolean;
  is_dump: boolean;
  volume_trend: number;
  ema_50_slope: number;
}
