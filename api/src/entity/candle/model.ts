import { Entity, Column } from 'typeorm';
import { CandleAttributes } from '@binance-trader/shared';

@Entity({ name: 'candles' })
export default class Candle implements CandleAttributes {
  @Column()
  macd: number;

  @Column()
  macd_signal: number;

  @Column()
  macd_histogram: number;

  @Column()
  mama: number;

  @Column()
  fama: number;

  @Column()
  atr: number;

  @Column()
  atr_stop: number;

  @Column()
  atr_sma: number;

  @Column()
  trend: number;

  @Column()
  trend_up: number;

  @Column()
  trend_down: number;

  @Column()
  adx: number;

  @Column()
  plus_di: number;

  @Column()
  minus_di: number;

  @Column()
  obv: number;

  @Column()
  obv_ema: number;

  @Column()
  ch_atr: number;

  @Column()
  ch_atr_ema: number;

  @Column()
  ema_50: number;

  @Column()
  is_pump: boolean;

  @Column()
  is_dump: boolean;

  @Column()
  volume_trend: number;

  @Column()
  ema_50_slope: number;

  @Column()
  id: string;

  @Column()
  symbol: string;

  @Column()
  event_time: number;

  @Column()
  open_time: number;

  @Column()
  close_time: number;

  @Column()
  interval: string;

  @Column()
  open_price: number;

  @Column()
  close_price: number;

  @Column()
  high_price: number;

  @Column()
  low_price: number;

  @Column()
  base_asset_volume: number;

  @Column()
  quote_asset_volume: number;

  @Column()
  date: string;
}
