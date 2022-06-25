import {
  BINANCE_ORDER_STATUS,
  BINANCE_ORDER_TYPES,
  DATABASE_MODELS,
  LeanOrderDocument,
  MessageBroker,
  MILLISECONDS,
  OrderAttributes,
  OrderModel,
  PositionModel,
  POSITION_EVENTS,
} from '@binance-trader/shared';
import { AxiosInstance } from 'axios';
import { Connection } from 'mongoose';
import {
  BUY_ORDER_TTL,
  MINUTES_BETWEEN_CANCEL_ATTEMPTS,
  SELL_ORDER_TTL,
} from '../../config';
import { parseOrder } from '../../utils';

// const MAX_REQUESTS = 48; // limit 50

// export const checkHeaders = async function checkHeaders(
//   headers: Record<string, string>,
//   model: AccountModel,
// ) {
//   if (+headers['x-mbx-order-count-10s'] >= MAX_REQUESTS) {
//     await model
//       .updateOne(
//         { id: process.env.NODE_ENV },
//         { $set: { create_order_after: Date.now() + 1e4 } },
//       )
//       .hint('id_1');
//   }

//   return;
// };

type GetOrderFromBinanceProps = {
  database: Connection;
  binance: AxiosInstance;
  order: OrderAttributes;
};

export const getOrderFromBinance = async function getOrderFromBinance({
  database,
  binance,
  order,
}: GetOrderFromBinanceProps): Promise<OrderAttributes | undefined> {
  if (!order) {
    throw new Error('Order is not defined.');
  }

  const orderModel: OrderModel = database.model(DATABASE_MODELS.ORDER);

  const query = new URLSearchParams({
    orderId: order.orderId.toString(),
    symbol: order.symbol,
  }).toString();

  const { data } = await binance.get(`/api/v3/order?${query}`);

  if (!data) {
    return;
  }

  const updatedOrder = await orderModel
    .findOneAndUpdate(
      { $and: [{ symbol: order.symbol }, { orderId: data.orderId }] },
      { $set: parseOrder(data) },
      { upsert: true, new: true },
    )
    .lean();

  return updatedOrder;
};

type CancelUnfilledOrdersProps = {
  database: Connection;
  binance: AxiosInstance;
  order: OrderAttributes;
  broker: MessageBroker;
};

export const cancelUnfilledOrders = async function cancelUnfilledOrders({
  database,
  binance,
  broker,
}: CancelUnfilledOrdersProps) {
  const positionModel: PositionModel = database.model(DATABASE_MODELS.POSITION);
  const orderModel: OrderModel = database.model(DATABASE_MODELS.ORDER);

  const orders: LeanOrderDocument[] = await orderModel
    .find({
      $and: [
        {
          status: {
            $nin: [BINANCE_ORDER_STATUS.FILLED, BINANCE_ORDER_STATUS.CANCELED],
          },
        },
        { time: { $gt: Date.now() - MILLISECONDS.HOUR } },
      ],
    })
    .select({
      side: true,
      type: true,
      eventTime: true,
      clientOrderId: true,
      symbol: true,
      orderId: true,
      lastCancelAttempt: true,
    })
    .hint('status_1_time_1')
    .lean();

  const filteredOrders = orders.filter((order) => {
    const canAttemptToCancelOrder =
      (order.lastCancelAttempt ?? 0) + MINUTES_BETWEEN_CANCEL_ATTEMPTS <
      Date.now();
    const shouldCancelBuyOrder =
      order.side === 'BUY' &&
      order.type === BINANCE_ORDER_TYPES.LIMIT &&
      Date.now() > order.eventTime + BUY_ORDER_TTL;
    const shouldCancelSellOrder =
      order.side === 'SELL' &&
      order.type === BINANCE_ORDER_TYPES.LIMIT &&
      Date.now() > order.eventTime + SELL_ORDER_TTL;

    return (
      (shouldCancelBuyOrder || shouldCancelSellOrder) && canAttemptToCancelOrder
    );
  });

  if (filteredOrders.length > 0) {
    for (const order of filteredOrders) {
      // order not placed via Web UI
      if (!(order.clientOrderId ?? '').match(/web_/)) {
        const tradeQuery = new URLSearchParams({
          symbol: order.symbol,
          orderId: order.orderId.toString(),
        }).toString();

        await orderModel
          .updateOne(
            { $and: [{ orderId: order.orderId }, { symbol: order.symbol }] },
            { $set: { lastCancelAttempt: Date.now() } },
          )
          .hint('orderId_-1_symbol_-1');

        try {
          await binance.delete(`/api/v3/order?${tradeQuery}`);
        } catch (error: unknown) {
          console.error(error);
          // update order in database, next time this function runs it will have the updated order
          await getOrderFromBinance({ database, binance, order });
          continue;
        }

        if (order.side === 'SELL') {
          const position = await positionModel
            .findOne({ 'sell_order.orderId': order.orderId })
            .hint('sell_order.orderId_1')
            .lean();

          if (position) {
            broker.publish(POSITION_EVENTS.POSITION_CLOSED_REQUEUE, position);
          }
        }
      }
    }
  }
};
