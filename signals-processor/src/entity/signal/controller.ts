import {
  CandleModel,
  CandleTickData,
  cloneObject,
  DATABASE_MODELS,
  getBooleanValue,
  getTimeDiff,
  LeanCandleDocument,
  LeanMarketDocument,
  LeanPositionDocument,
  LeanSignalDocument,
  MarketModel,
  MILLISECONDS,
  PositionModel,
  POSITION_STATUS,
  SignalModel,
  toSymbolPrecision,
  MongoError,
  MessageBroker,
  SIGNAL_EVENTS,
} from '@binance-trader/shared';
import { Connection, Types } from 'mongoose';
import {
  RedisClientType,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from 'redis';
import { LAST_POSITION_HOURS_LOOKUP, SIGNAL_HOURS_LOOKUP } from '../../config';
import { applyStrategy } from '../../strategy';
import { getPlainCandle } from '../../utils';
import logger from '../../utils/logger';

type ServicesProps = {
  database: Connection;
  redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
  broker: MessageBroker;
};

type ProcessSignalsProps = ServicesProps & {
  candle: CandleTickData;
};

/**
 * @description Processes existing open signals, or creates new ones.
 */
export const processSignals = async function processSignals({
  database,
  redis,
  broker,
  candle: { symbol, interval },
}: ProcessSignalsProps) {
  const redisKeys = {
    lock: `${symbol}_process_signals_lock`,
    lockDate: `${symbol}_process_signals_lock_date`,
  };

  const removeLock = async () => {
    await Promise.allSettled([
      redis.del(redisKeys.lock),
      redis.del(redisKeys.lockDate),
    ]);
  };

  const setLock = () => {
    return Promise.allSettled([
      redis.set(redisKeys.lock, 1),
      redis.set(redisKeys.lockDate, Date.now()),
    ]);
  };

  const lockDate = await redis.get(redisKeys.lockDate);

  // removes lock if it's been more than three minutes since the last time it was locked
  if (
    lockDate &&
    new Date(+lockDate).getTime() < Date.now() - MILLISECONDS.MINUTE * 3
  ) {
    await removeLock();
  }

  const hasLock = getBooleanValue(await redis.get(redisKeys.lock));

  if (hasLock) {
    return;
  }

  await setLock();

  const signalModel: SignalModel = database.model(DATABASE_MODELS.SIGNAL);
  const candleModel: CandleModel = database.model(DATABASE_MODELS.CANDLE);
  const marketModel: MarketModel = database.model(DATABASE_MODELS.MARKET);
  const positionModel: PositionModel = database.model(DATABASE_MODELS.POSITION);

  const count = await candleModel
    .countDocuments({
      $and: [
        { symbol },
        { open_time: { $gte: Date.now() - getTimeDiff(155, interval) } },
      ],
    })
    .hint('symbol_1_open_time_1');

  if (count < 150) {
    return removeLock();
  }

  //last 10
  const candles: LeanCandleDocument[] = await candleModel
    .find({
      $and: [
        { symbol },
        { open_time: { $gte: Date.now() - getTimeDiff(10, interval) } },
      ],
    })
    .hint('symbol_1_open_time_1')
    .sort({ open_time: 1 })
    .lean();

  const last_candle = cloneObject(candles[candles.length - 1]);

  const hoursLookup = SIGNAL_HOURS_LOOKUP;
  const positionHoursLookup = LAST_POSITION_HOURS_LOOKUP;

  const open_signals: LeanSignalDocument[] = await signalModel
    .find({
      $and: [
        { symbol },
        { status: POSITION_STATUS.OPEN },
        { trigger_time: { $gt: Date.now() - hoursLookup } },
      ],
    })
    .select({ symbol: true, trailing_stop_buy: true })
    .hint('symbol_1_status_1_trigger_time_-1')
    .sort({ trigger_time: -1 })
    .lean();

  if (open_signals.length === 0) {
    const last_open_position: LeanPositionDocument = await positionModel
      .findOne({
        $and: [
          { symbol },
          { status: POSITION_STATUS.OPEN },
          { open_time: { $gt: Date.now() - positionHoursLookup } },
        ],
      })
      .select({ buy_price: true, sell_price: true })
      .hint('symbol_1_status_1_open_time_-1')
      .sort({ open_time: -1 })
      .lean();

    const triggeredSignal = applyStrategy(candles, last_open_position);

    if (triggeredSignal) {
      const id = `${symbol}_${interval}_${last_candle.event_time}`;

      try {
        await signalModel.create({
          ...triggeredSignal,
          trailing_stop_buy: toSymbolPrecision(
            last_candle.close_price,
            last_candle.symbol,
          ),
          open_candle: getPlainCandle(last_candle),
          id,
        });
      } catch (error: unknown) {
        if ((error as MongoError).code === 11000) {
          logger.error(`Trying to create duplicate signal with ID '${id}'`);
        }
        logger.error(error);
      }
    }

    return removeLock();
  }

  const updated_signals_promises = open_signals.map(
    async (open_signal, index) => {
      try {
        if (index > 0) {
          return signalModel
            .deleteOne({
              _id: new Types.ObjectId(open_signal._id),
            })
            .hint('_id_');
        }

        const market: LeanMarketDocument = await marketModel
          .findOne({ symbol: open_signal.symbol })
          .select({ trader_lock: true, enabled: true })
          .hint('symbol_1')
          .lean();

        if (
          last_candle.close_price >= open_signal.trailing_stop_buy &&
          !market.trader_lock
        ) {
          const close_price = toSymbolPrecision(
            open_signal.trailing_stop_buy,
            last_candle.symbol,
          );

          const updatedSignal = await signalModel.findByIdAndUpdate(
            open_signal._id,
            {
              $set: {
                status: POSITION_STATUS.CLOSED,
                price: close_price,
                close_candle: getPlainCandle(last_candle),
                close_time: Date.now(),
                close_date: new Date(),
                broadcast: market.enabled,
              },
            },
            { new: true },
          );

          broker.publish(SIGNAL_EVENTS.SIGNAL_CLOSED, {
            id: updatedSignal?.id,
          });

          return Promise.resolve();
        }

        const tsb = toSymbolPrecision(
          last_candle.close_price,
          last_candle.symbol,
        );

        if (tsb < open_signal.trailing_stop_buy) {
          await signalModel
            .updateOne(
              { _id: new Types.ObjectId(open_signal._id) },
              { $set: { trailing_stop_buy: tsb } },
            )
            .hint('_id_');
        }

        return Promise.resolve();
      } catch (error: unknown) {
        logger.error(error);
      }
    },
  );

  await Promise.all(updated_signals_promises);

  return removeLock();
};
