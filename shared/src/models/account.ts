import mongoose, { SchemaOptions } from 'mongoose';
import { AccountAttributes } from '../interfaces/account';

const assetSubsSchema = new mongoose.Schema(
  {
    asset: { type: String },
    free: { type: Number },
  },
  { _id: false },
);

export const createAccountSchema = function createAccountSchema(
  options: SchemaOptions = {},
) {
  const schema = new mongoose.Schema<AccountAttributes>(
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
  );

  schema.index({ id: 1 }, { unique: true });

  return schema;
};
