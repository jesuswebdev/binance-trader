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
  nz,
  OrderAttributes,
  OrderModel,
  PAIRS,
  PositionModel,
  POSITION_EVENTS,
  POSITION_STATUS,
  SIGNAL_TYPES,
  toSymbolPrecision,
  toSymbolStepPrecision,
} from '@binance-trader/shared';
import { AxiosInstance } from 'axios';
import { Connection } from 'mongoose';
import {
  BINANCE_MINIMUM_ORDER_SIZE,
  BUY_ORDER_TTL,
  BUY_ORDER_TYPE,
  DEFAULT_BUY_AMOUNT,
  MINUTES_BETWEEN_CANCEL_ATTEMPTS,
  SELL_ORDER_TTL,
  SELL_ORDER_TYPE,
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

type GetOrderFromDbOrBinanceProps = Omit<ServicesProps, 'broker'> & {
  database: Connection;
  binance: AxiosInstance;
  order: OrderAttributes;
};

export const getOrderFromDbOrBinance = async function getOrderFromDbOrBinance({
  database,
  binance,
  order: buy_order,
}: GetOrderFromDbOrBinanceProps): Promise<OrderAttributes | undefined> {
  if (!buy_order) {
    throw new Error('Order is not defined.');
  }

  const orderModel: OrderModel = database.model(DATABASE_MODELS.ORDER);
  const order = await orderModel
    .findOne({
      $and: [{ orderId: buy_order.orderId }, { symbol: buy_order.symbol }],
    })
    .hint('orderId_-1_symbol_-1')
    .lean();

  if (order) {
    return order;
  }

  console.log(
    `${buy_order.symbol}-${buy_order.orderId}| Order does not exist in database. Attempting to fetch from Binance.`,
  );

  try {
    const orderFromBinance = await getOrderFromBinance({
      database,
      binance,
      order: buy_order,
    });

    if (!orderFromBinance?.orderId) {
      console.log('Order does not exist in Binance.');

      return;
    }

    return orderFromBinance;
  } catch (error: unknown) {
    console.error(error);
  }
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

  // find all positions where base asset = quote asset
  // sum all quantity and substract that from the balance
  // that would be the free amount

  const symbolsWithSameBaseAssetAsTheQuoteAsset = PAIRS.filter(
    (pair) => pair.baseAsset === market.quote_asset,
  ).map((pair) => pair.symbol);

  const openPositions = await positionModel
    .find({
      $and: [
        { status: POSITION_STATUS.OPEN },
        { symbol: { $in: symbolsWithSameBaseAssetAsTheQuoteAsset } },
        { 'buy_order.orderId': { $exists: true } },
      ],
    })
    .select({ buy_order: true })
    .lean();

  let reservedAmount = 0;

  if (openPositions.length > 0) {
    const existingOrders = await Promise.all(
      openPositions.map((pos) =>
        getOrderFromDbOrBinance({
          database,
          binance,
          order: pos.buy_order as OrderAttributes,
        }),
      ),
    );

    for (const existingOrder of existingOrders) {
      if (!existingOrder) {
        continue;
      }

      reservedAmount += +existingOrder.cummulativeQuoteQty;
    }
  }

  const defaultBuyAmount = DEFAULT_BUY_AMOUNT[market.quote_asset];

  const enoughBalance = assetBalance.free - reservedAmount > defaultBuyAmount;
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
    side: SIGNAL_TYPES.BUY,
  };

  if (BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.MARKET) {
    query.quoteOrderQty = defaultBuyAmount.toString();
  }

  if (BUY_ORDER_TYPE === BINANCE_ORDER_TYPES.LIMIT) {
    query.timeInForce = 'GTC';
    query.price = position.buy_price.toString();
    query.quantity = toSymbolStepPrecision(
      defaultBuyAmount / position.buy_price,
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
    throw error;
  } finally {
    await marketModel
      .updateOne({ symbol: position.symbol }, { $set: { trader_lock: false } })
      .hint('symbol_1');
  }
};

type CreateSellOrderProps = Omit<ServicesProps, 'broker'> & {
  database: Connection;
  binance: AxiosInstance;
  position: LeanPositionDocument;
  orderType?: BinanceOrderTypes;
};

export const createSellOrder = async function createSellOrder({
  database,
  binance,
  position,
}: CreateSellOrderProps) {
  if (!position) {
    console.log('Position is not defined');

    return;
  }

  const accountModel: AccountModel = database.model(DATABASE_MODELS.ACCOUNT);
  const positionModel: PositionModel = database.model(DATABASE_MODELS.POSITION);
  const marketModel: MarketModel = database.model(DATABASE_MODELS.MARKET);

  const account: LeanAccountDocument = await accountModel
    .findOne({ id: process.env.NODE_ENV })
    .hint('id_1')
    .lean();

  const hasBuyOrder = !!position.buy_order;

  if (Date.now() < account?.create_order_after) {
    throw new Error(
      `${position.id} | Unable to continue. Reason: 10s order limit reached.`,
    );
  }

  if (!hasBuyOrder) {
    return;
  }

  const market: LeanMarketDocument = await marketModel
    .findOne({ symbol: position.symbol })
    .select({ last_price: true, trader_lock: true })
    .hint('symbol_1')
    .lean();

  if (market.trader_lock) {
    throw new Error(
      `${position.symbol} | ${position._id} | Market lock is set. Unable to continue.`,
    );
  }

  await marketModel
    .updateOne(
      { symbol: position.symbol },
      { $set: { trader_lock: true, last_trader_lock_update: Date.now() } },
    )
    .hint('symbol_1');

  try {
    const query: Record<string, string> = {
      type: SELL_ORDER_TYPE,
      symbol: position.symbol,
      side: SIGNAL_TYPES.SELL,
    };

    if (query.type === BINANCE_ORDER_TYPES.LIMIT) {
      query.timeInForce = 'GTC';
      query.price = (position.sell_price ?? market.last_price).toString();
    }

    let buy_order = await getOrderFromDbOrBinance({
      database,
      binance,
      order: position.buy_order as OrderAttributes,
    });

    if (!buy_order) {
      console.log(
        `Position with id '${position._id}' does not have a buy order`,
      );

      return;
    }

    if (
      buy_order.status !== BINANCE_ORDER_STATUS.CANCELED &&
      buy_order.status !== BINANCE_ORDER_STATUS.FILLED
    ) {
      console.log(
        `${position._id} | Order (${buy_order.symbol}-${buy_order.orderId}) has not been filled. Cancelling...`,
      );

      //cancel order and refetch from db
      const cancel_query = new URLSearchParams({
        symbol: buy_order.symbol,
        orderId: buy_order.orderId.toString(),
      }).toString();

      try {
        await binance.delete(`/api/v3/order?${cancel_query}`);

        buy_order = await getOrderFromDbOrBinance({
          database,
          binance,
          order: position.buy_order as OrderAttributes,
        });
      } catch (error) {
        console.log(
          `Error while trying to cancel sell order for position '${position._id}'`,
        );
        buy_order = await getOrderFromBinance({
          database,
          binance,
          order: position.buy_order as OrderAttributes,
        });
      }
    }

    if (!buy_order) {
      console.log(
        `Buy order for position with id '${position._id}' does not exist`,
      );

      return;
    }

    const quantity_to_sell =
      nz(+buy_order.executedQty) -
      (position.symbol.replace(market.quote_asset, '') ===
      buy_order.commissionAsset
        ? nz(+buy_order.commissionAmount)
        : 0);

    if (quantity_to_sell === 0) {
      console.log(`Buy order for position '${position._id}' was not filled.`);

      return;
    }

    const sellValue = toSymbolPrecision(
      quantity_to_sell * market.last_price,
      position.symbol,
    );

    if (sellValue < BINANCE_MINIMUM_ORDER_SIZE[market.quote_asset]) {
      console.log(
        `Sell value (${sellValue} ${
          market.quote_asset
        }) is below the minimum order size (${
          BINANCE_MINIMUM_ORDER_SIZE[market.quote_asset]
        } ${market.quote_asset}).`,
      );

      return;
    }

    query.quantity = toSymbolStepPrecision(
      quantity_to_sell,
      position.symbol,
    ).toString();

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
        .updateOne({ id: position.id }, { $set: { sell_order: data } })
        .hint('id_1');
    }
  } catch (error: unknown) {
    console.error(error);
    throw error;
  } finally {
    await marketModel
      .updateOne({ symbol: position.symbol }, { $set: { trader_lock: false } })
      .hint('symbol_1');
  }
};

type CreateSellOrderForCanceledOrderProps = Omit<ServicesProps, 'broker'> & {
  database: Connection;
  binance: AxiosInstance;
  position: LeanPositionDocument;
  orderType?: BinanceOrderTypes;
};

export const createSellOrderForCanceledOrder =
  async function createSellOrderForCanceledOrder({
    database,
    binance,
    position,
  }: CreateSellOrderForCanceledOrderProps) {
    if (!position) {
      console.log('Position is not defined');

      return;
    }

    const accountModel: AccountModel = database.model(DATABASE_MODELS.ACCOUNT);
    const positionModel: PositionModel = database.model(
      DATABASE_MODELS.POSITION,
    );
    const marketModel: MarketModel = database.model(DATABASE_MODELS.MARKET);
    const orderModel: OrderModel = database.model(DATABASE_MODELS.ORDER);

    const account: LeanAccountDocument = await accountModel
      .findOne({ id: process.env.NODE_ENV })
      .hint('id_1')
      .lean();

    const hasSellOrder = !!position.sell_order;

    if (Date.now() < account?.create_order_after) {
      throw new Error(
        `${position.id} | Unable to continue. Reason: 10s order limit reached.`,
      );
    }

    if (!hasSellOrder) {
      return;
    }

    const market: LeanMarketDocument = await marketModel
      .findOne({ symbol: position.symbol })
      .select({ last_price: true, trader_lock: true })
      .hint('symbol_1')
      .lean();

    if (market.trader_lock) {
      throw new Error(
        `${position.symbol} | ${position._id} | Market lock is set. Unable to continue.`,
      );
    }

    await marketModel
      .updateOne(
        { symbol: position.symbol },
        { $set: { trader_lock: true, last_trader_lock_update: Date.now() } },
      )
      .hint('symbol_1');

    try {
      const query: Record<string, string> = {
        type: BINANCE_ORDER_TYPES.MARKET,
        symbol: position.symbol,
        side: 'SELL',
      };

      let sell_order = await getOrderFromDbOrBinance({
        database,
        binance,
        order: position.sell_order as OrderAttributes,
      });

      if (!sell_order) {
        console.log(`Position '${position._id}' does not have a sell order`);

        return;
      }

      if (
        sell_order.status !== BINANCE_ORDER_STATUS.CANCELED &&
        sell_order.status !== BINANCE_ORDER_STATUS.FILLED
      ) {
        if (
          (sell_order.lastCancelAttempt ?? 0) +
            MINUTES_BETWEEN_CANCEL_ATTEMPTS >
          Date.now()
        ) {
          return;
        }

        await orderModel
          .updateOne(
            {
              $and: [
                { orderId: sell_order.orderId },
                { symbol: sell_order.symbol },
              ],
            },
            { $set: { lastCancelAttempt: Date.now() } },
          )
          .hint('orderId_-1_symbol_-1');

        console.log(
          `${position._id} | Order (${sell_order.symbol}-${sell_order.orderId}) has not been filled. Cancelling...`,
        );

        //cancel order and refetch from db
        const cancel_query = new URLSearchParams({
          symbol: sell_order.symbol,
          orderId: sell_order.orderId.toString(),
        }).toString();

        try {
          await binance.delete(`/api/v3/order?${cancel_query}`);

          sell_order = await getOrderFromDbOrBinance({
            database,
            binance,
            order: position.sell_order as OrderAttributes,
          });
        } catch (error) {
          console.error(
            `Error while trying to cancel sell order for position '${position._id}'`,
          );
          sell_order = await getOrderFromBinance({
            database,
            binance,
            order: position.sell_order as OrderAttributes,
          });
        }
      }

      if (!sell_order) {
        console.log(`Position '${position._id}' does not have a sell order`);

        return;
      }

      const buy_order = await getOrderFromDbOrBinance({
        database,
        binance,
        order: position.buy_order as OrderAttributes,
      });

      if (!buy_order) {
        console.log(`Position '${position._id}' does not have a buy order`);

        return;
      }

      const quantity_to_sell =
        // the purchased quantity
        nz(+sell_order.origQty) -
        // minus the quantity that could have been sold in the limit order
        nz(+sell_order.executedQty) -
        (position.symbol.replace(market.quote_asset, '') ===
        sell_order.commissionAsset
          ? nz(+sell_order.commissionAmount)
          : 0);

      if (quantity_to_sell === 0) {
        console.log(
          `Sell order for position '${position._id}' was already filled. Nothing to sell.`,
        );

        return;
      }

      const sellValue = toSymbolPrecision(
        quantity_to_sell * market.last_price,
        position.symbol,
      );

      if (sellValue < BINANCE_MINIMUM_ORDER_SIZE[market.quote_asset]) {
        console.log(
          `Sell value (${sellValue} ${
            market.quote_asset
          }) is below the minimum order size (${
            BINANCE_MINIMUM_ORDER_SIZE[market.quote_asset]
          } ${market.quote_asset}).`,
        );

        return;
      }

      query.quantity = toSymbolStepPrecision(
        quantity_to_sell,
        position.symbol,
      ).toString();

      console.log(
        `${position._id} | Attempting to create order: ${JSON.stringify(
          query,
        )}`,
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
          .updateOne({ id: position.id }, { $set: { sell_order: data } })
          .hint('id_1');
      }
    } catch (error: unknown) {
      console.error(error);
      throw error;
    } finally {
      await marketModel
        .updateOne(
          { symbol: position.symbol },
          { $set: { trader_lock: false } },
        )
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
