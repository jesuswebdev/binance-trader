import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, LeanType } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export type LeanOrderDocument = LeanType<OrderDocument>;

@Schema({ timestamps: true })
export class Order {
  @Prop()
  symbol: string;

  @Prop()
  orderId: number;

  @Prop()
  orderListId: number;

  @Prop()
  clientOrderId: string;

  @Prop()
  price: string;

  @Prop()
  origQty: string;

  @Prop()
  executedQty: string;

  @Prop()
  cummulativeQuoteQty: string;

  @Prop()
  commissionAmount: string;

  @Prop()
  commissionAsset: string;

  @Prop()
  status: string;

  @Prop()
  timeInForce: string;

  @Prop()
  type: string;

  @Prop()
  side: string;

  @Prop()
  stopPrice: string;

  @Prop()
  icebergQty: string;

  @Prop()
  time: number;

  @Prop()
  origQuoteOrderQty: string;

  @Prop()
  eventTime: number;

  @Prop()
  transactTime: number;

  @Prop()
  lastCancelAttempt: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
