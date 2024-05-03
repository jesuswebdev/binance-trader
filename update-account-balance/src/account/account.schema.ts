import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountDocument = HydratedDocument<Account>;

export type AccountBalances = { asset: string; free: number }[];

@Schema({ timestamps: true, autoIndex: false })
export class Account {
  @Prop()
  id: string;

  @Prop(raw([{ _id: false, asset: { type: String }, free: { type: Number } }]))
  balances: AccountBalances;

  @Prop()
  type: string;

  @Prop()
  last_order_error: number;

  @Prop()
  spot_account_listen_key: string;

  @Prop()
  last_spot_account_listen_key_update: number;

  @Prop()
  create_order_after: number;

  @Prop()
  total_balance: number;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
