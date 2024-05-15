import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CandleDocument = HydratedDocument<Candle>;

@Schema({ timestamps: true, autoIndex: false })
export class Candle {
  @Prop()
  id: string;

  @Prop()
  symbol: string;

  @Prop()
  event_time: number;

  @Prop()
  open_time: number;

  @Prop()
  close_time: number;

  @Prop()
  interval: string;

  @Prop()
  open_price: number;

  @Prop()
  close_price: number;

  @Prop()
  high_price: number;

  @Prop()
  low_price: number;

  @Prop()
  base_asset_volume: number;

  @Prop()
  quote_asset_volume: number;

  @Prop()
  date: string;

  @Prop()
  macd: number;

  @Prop()
  macd_signal: number;

  @Prop()
  macd_histogram: number;

  @Prop()
  mama: number;

  @Prop()
  fama: number;

  @Prop()
  atr: number;

  @Prop()
  atr_stop: number;

  @Prop()
  atr_sma: number;

  @Prop()
  trend: number;

  @Prop()
  trend_up: number;

  @Prop()
  trend_down: number;

  @Prop()
  adx: number;

  @Prop()
  plus_di: number;

  @Prop()
  minus_di: number;

  @Prop()
  obv: number;

  @Prop()
  obv_ema: number;

  @Prop()
  ch_atr: number;

  @Prop()
  ch_atr_ema: number;

  @Prop()
  ema_50: number;

  @Prop()
  is_pump: boolean;

  @Prop()
  is_dump: boolean;

  @Prop()
  volume_trend: number;

  @Prop()
  ema_50_slope: number;

  @Prop()
  ha_open: number;

  @Prop()
  ha_close: number;

  @Prop()
  ha_high: number;

  @Prop()
  ha_low: number;

  updatedAt: Date;
}

export const CandleSchema = SchemaFactory.createForClass(Candle);
