import {
  AccountModel,
  BinanceOrderTypes,
  BINANCE_ORDER_STATUS,
  BINANCE_ORDER_TYPES,
  DATABASE_MODELS,
  LeanAccountDocument,
  LeanMarketDocument,
  LeanOrderDocument,
  LeanPositionDocument,
  MarketModel,
  MessageBroker,
  MILLISECONDS,
  OrderAttributes,
  OrderModel,
  PositionModel,
  POSITION_EVENTS,
  toSymbolStepPrecision,
} from '@binance-trader/shared';
import { AxiosInstance } from 'axios';
import { Connection } from 'mongoose';
import {
  BUY_ORDER_TTL,
  BUY_ORDER_TYPE,
  DEFAULT_BUY_AMOUNT,
  MINUTES_BETWEEN_CANCEL_ATTEMPTS,
  SELL_ORDER_TTL,
} from '../../config';
import { parseOrder } from '../../utils';

type ServicesProps = {
  database: Connection;
  binance: AxiosInstance;
  broker: MessageBroker;
};

const MAX_REQUESTS = 48; // limit 50

export const checkHeaders = async function checkHeaders(
  headers: Record<string, string>,
  model: AccountModel,
) {
  if (+headers['x-mbx-order-count-10s'] >= MAX_REQUESTS) {
    await model
      .updateOne(
        { id: process.env.NODE_ENV },
        { $set: { create_order_after: Date.now() + 1e4 } },
      )
      .hint('id_1');
  }

  return;
};

type GetOrderFromBinanceProps = Omit<ServicesProps, 'broker'> & {
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

type CreateBuyOrderProps = Omit<ServicesProps, 'broker'> & {
  database: Connection;
  binance: AxiosInstance;
  position: LeanPositionDocument;
  orderType?: BinanceOrderTypes;
};

export const createBuyOrder = async function createBuyOrder({
  database,
  binance,
  position,
  orderType,
}: CreateBuyOrderProps) {
  const accountModel: AccountModel = database.model(DATABASE_MODELS.ACCOUNT);
  const positionModel: PositionModel = database.model(DATABASE_MODELS.POSITION);
  const marketModel: MarketModel = database.model(DATABASE_MODELS.MARKET);

  const account: LeanAccountDocument = await accountModel
    .findOne({ id: process.env.NODE_ENV })
    .hint('id_1')
    .lean();

  if (!account) {
    console.log(`Account with ID '${process.env.NODE_ENV}' not found.`);

    return;
  }

  const market: LeanMarketDocument = await marketModel
    .findOne({ symbol: position.symbol })
    .select({ enabled: true, trader_lock: true, quote_asset: true })
    .hint('symbol_1')
    .lean();

  if (!market.enabled) {
    console.log(
      `${position.symbol} | ${position._id} | Market disabled for trading.`,
    );

    return;
  }

  const [assetBalance] = account.balances.filter(
    (balance) => balance.asset === market.quote_asset,
  );

  const enoughBalance = assetBalance.free > DEFAULT_BUY_AMOUNT;
  const positionHasBuyOrder = await positionModel.exists({
    $and: [{ id: position.id }, { 'buy_order.orderId': { $exists: true } }],
  });

  if (
    Date.now() < account.create_order_after ||
    !enoughBalance ||
    positionHasBuyOrder
  ) {
    let reason = '10s order limit reached.';

    if (!enoughBalance) {
      reason = 'Not enough balance.';
    }

    if (positionHasBuyOrder) {
      reason = 'Buy order has already been created for this position';
    }

    console.log(
      `${position.symbol} | ${position._id} | Unable to continue. Reason: ${reason}`,
    );

    return;
  }

  if (market.trader_lock) {
    throw new Error(
      `${position.symbol} | Market lock is set. Unable to continue.`,
    );
  }

  await marketModel
    .updateOne(
      { symbol: position.symbol },
      { $set: { trader_lock: true, last_trader_lock_update: Date.now() } },
    )
    .hint('symbol_1');

  const query: Record<string, string> = {
    type: orderType ?? BUY_ORDER_TYPE,
    symbol: position.symbol,
    side: 'BUY',
  };

  if (BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.MARKET) {
    query.quoteOrderQty = DEFAULT_BUY_AMOUNT.toString();
  }

  if (BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.LIMIT) {
    query.timeInForce = 'GTC';
    query.price = position.buy_price.toString();
    query.quantity = toSymbolStepPrecision(
      DEFAULT_BUY_AMOUNT / position.buy_price,
      position.symbol,
    ).toString();
  }

  try {
    console.log(
      `${position._id} | Attempting to create order: ${JSON.stringify(query)}`,
    );

    const searchParams = new URLSearchParams(query).toString();

    const { data, headers } = await binance.post(
      `/api/v3/order?${searchParams}`,
    );

    await checkHeaders(headers, accountModel);

    if (data?.orderId) {
      const createdOrder = {
        symbol: position.symbol,
        orderId: data.orderId,
        clientOrderId: data.clientOrderId,
      };

      console.log(
        `${position._id} | Order created: ${JSON.stringify(createdOrder)}`,
      );

      await positionModel
        .updateOne({ id: position.id }, { $set: { buy_order: data } })
        .hint('id_1');
    }
  } catch (error: unknown) {
    console.error(error);
  } finally {
    await marketModel
      .updateOne({ symbol: position.symbol }, { $set: { trader_lock: false } })
      .hint('symbol_1');
  }
};

type CancelUnfilledOrdersProps = ServicesProps;

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
