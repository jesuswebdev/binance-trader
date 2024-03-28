import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type PositionDocument = HydratedDocument<Position>;

@Schema({ timestamps: true })
export class Position {
  @Prop()
  id: string;

  @Prop()
  symbol: string;

  @Prop()
  open_time: number;

  @Prop()
  close_time: number;

  @Prop()
  date: Date;

  @Prop()
  close_date: Date;

  @Prop()
  status: string;

  @Prop()
  change: number;

  @Prop()
  cost: number;

  @Prop()
  buy_price: number;

  @Prop()
  buy_amount: number;

  @Prop()
  sell_price: number;

  @Prop()
  take_profit: number;

  @Prop()
  stop_loss: number;

  @Prop()
  arm_trailing_stop_loss: number;

  @Prop()
  trailing_stop_loss: number;

  @Prop()
  trailing_stop_loss_armed: number;

  @Prop()
  trigger: string;

  @Prop()
  profit: number;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  signal: number;

  @Prop({ type: Object })
  buy_order: Record<string, any>;

  @Prop({ type: Object })
  sell_order: Record<string, any>;

  @Prop()
  sell_trigger: string;

  @Prop({ type: Object })
  sell_candle: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  account_id: number;

  @Prop({ type: Object })
  configuration: Record<string, any>;

  @Prop()
  trailing_stop_loss_trigger_time: number;

  @Prop()
  stop_loss_trigger_time: number;

  @Prop()
  take_profit_trigger_time: number;

  @Prop()
  last_tsl_update: number;

  @Prop()
  trader_lock: boolean;

  @Prop()
  last_stop_loss_update: number;

  @Prop()
  broadcast: boolean;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
