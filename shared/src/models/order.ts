import mongoose, { SchemaOptions } from 'mongoose';
import { OrderAttributes } from '../interfaces/order';

export const createOrderSchema = function createOrderSchema(
  options: SchemaOptions = {},
) {
  const schema = new mongoose.Schema<OrderAttributes>(
    {
      symbol: { type: String },
      orderId: { type: Number },
      orderListId: { type: Number },
      clientOrderId: { type: String },
      price: { type: String },
      origQty: { type: String },
      executedQty: { type: String },
      cummulativeQuoteQty: { type: String },
      commissionAmount: { type: String },
      commissionAsset: { type: String },
      status: { type: String },
      timeInForce: { type: String },
      type: { type: String },
      side: { type: String },
      stopPrice: { type: String },
      icebergQty: { type: String },
      time: { type: Number },
      origQuoteOrderQty: { type: String },
      eventTime: { type: Number },
      transactTime: { type: Number },
      lastCancelAttempt: { type: Number },
    },
    { timestamps: true, ...options },
  );

  schema.index({ orderId: -1, symbol: -1 }, { unique: true });
  schema.index({ status: 1, time: 1 });
  schema.index({ clientOrderId: 1 });

  return schema;
};
