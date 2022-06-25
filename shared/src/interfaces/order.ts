import { LeanDocument, Model, Types } from 'mongoose';

export interface OrderAttributes {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  commissionAmount: string;
  commissionAsset: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice: string;
  icebergQty: string;
  time: number;
  origQuoteOrderQty: string;
  eventTime: number;
  transactTime: number;
  lastCancelAttempt: number;
}

export interface OrderDocument extends Document, OrderAttributes {
  id: string;
  _id: Types.ObjectId;
}

export interface LeanOrderDocument extends LeanDocument<OrderAttributes> {
  _id: string;
  __v: number;
}

// eslint-disable-next-line
export interface OrderModel extends Model<OrderDocument> {}
