import { Connection, UpdateQuery } from 'mongoose';
import {
  createOrderSchema,
  DATABASE_MODELS,
  OrderModel,
} from '@binance-trader/shared';

const schema = createOrderSchema();

export function createOrderModel(connection: Connection) {
  connection.model(
    DATABASE_MODELS.ORDER,
    schema.pre(
      'updateOne',
      { query: true },
      async function updateOneMiddleware(next) {
        const query = this as UpdateQuery<OrderModel>;
        const doc = await query.model.findOne(query.getQuery()).lean();

        // upsert
        if (!doc) {
          next();
        }

        const updateObject = query.getUpdate();

        if (Reflect.has(updateObject['$set'], 'executedQty')) {
          if (+updateObject['$set']['executedQty'] < doc.executedQty) {
            throw new Error(
              'Invalid executedQty value. Cannot update current document with old values.',
            );
          }
        }

        next();
      },
    ),
  );
}
