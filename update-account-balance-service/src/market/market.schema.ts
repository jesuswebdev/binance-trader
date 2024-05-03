import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MarketDocument = HydratedDocument<Market>;

@Schema({ timestamps: true, autoIndex: false })
export class Market {
  @Prop()
  symbol: string;

  @Prop()
  quote_asset: string;

  @Prop()
  base_asset: string;

  @Prop()
  price_tick_size: number;

  @Prop()
  step_size: number;

  @Prop()
  enabled: boolean;

  @Prop()
  trading_enabled: boolean;

  @Prop()
  last_price: number;

  @Prop()
  last_trader_lock_update: number;

  @Prop()
  trader_lock: boolean;
}

export const MarketSchema = SchemaFactory.createForClass(Market);
