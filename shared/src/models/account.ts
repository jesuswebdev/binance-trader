import mongoose, { SchemaOptions } from 'mongoose';
import { AccountAttributes } from '../interfaces/account';

export function createAccountSchema(options: SchemaOptions = {}) {
  const assetSubsSchema = new mongoose.Schema(
    {
      asset: { type: String },
      free: { type: Number },
    },
    { _id: false },
  );

  return new mongoose.Schema<AccountAttributes>(
    {
      id: { type: String },
      balances: {
        type: [assetSubsSchema],
      },
      type: { type: String },
      last_order_error: { type: Number },
      spot_account_listen_key: { type: String },
      last_spot_account_listen_key_update: { type: Number, default: 0 },
      create_order_after: { type: Number },
    },
    { timestamps: true, ...options },
  ).index({ id: 1 }, { unique: true });
}
