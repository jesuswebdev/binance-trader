import { Connection } from 'mongoose';
import { AxiosInstance } from 'axios';
import {
  CandleModel,
  CandleTickData,
  DATABASE_MODELS,
  getBooleanValue,
  getTimeDiff,
  LeanCandleDocument,
  MarketModel,
  PAIRS,
} from '@binance-trader/shared';
import { CANDLE_INTERVAL, PROCESS_CANDLES_INTERVAL } from '../../config';
import {
  buildCandles,
  getIndicatorsValues,
  getOHLCValues,
  getRedisKeys,
} from '../../utils';
import {
  RedisClientType,
  RedisFunctions,
  RedisModules,
  RedisScripts,
} from 'redis';

type ServicesProps = {
  binance: AxiosInstance;
  database: Connection;
  redis: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
};

type FillCandlesDataProps = ServicesProps;

type ProcessCandlesProps = ServicesProps & {
  candles: CandleTickData[];
};

type ProcessCandleTickProps = ServicesProps & {
  candle: CandleTickData;
};

interface RedisError {
  code: string;
}

/**
 * @description Checks if candles need to be processed further according to `PROCESS_CANDLES_INTERVAL` environment variable.
 * If the candles need to be processed, it will take all the candles stored in redis, filter out the latest values, save to mongodb, and return them,
 * otherwise it stores the candle data in redis.
 */
export const processCandleTick = async function processCandleTick({
  redis,
  database,
  candle,
}: ProcessCandleTickProps) {
  const processCandlesInterval = PROCESS_CANDLES_INTERVAL;

  const candleModel: CandleModel = database.model(DATABASE_MODELS.CANDLE);

  const marketModel: MarketModel = database.model(DATABASE_MODELS.MARKET);

  const redisKeys = getRedisKeys(candle);

  const lastCandlesProcessDate = await redis.get(redisKeys.lastProcessDate);

  const candlesPersistLock = getBooleanValue(
    await redis.get(redisKeys.candlesPersistLock),
  );

  // force remove lock if it hasn't been removed in the last 2 interval check
  if (
    Date.now() - +(lastCandlesProcessDate || 0) > processCandlesInterval * 2 &&
    !!candlesPersistLock
  ) {
    await redis.del(redisKeys.candlesPersistLock);
  }

  if (
    Date.now() - +(lastCandlesProcessDate || 0) > processCandlesInterval &&
    !candlesPersistLock
  ) {
    await redis.set(redisKeys.candlesPersistLock, 1);
    await redis.set(redisKeys.lastProcessDate, Date.now());

    const length = await redis.lLen(redisKeys.candles);

    const candles = (await redis.lPopCount(redisKeys.candles, length)) || [];

    candles.push(JSON.stringify(candle));

    const toUpdate: CandleTickData[] = Object.values(
      candles.reduce((acc, candle) => {
        const parsed: CandleTickData = JSON.parse(candle);

        return { ...acc, [parsed.id]: parsed };
      }, {}),
    );

    if (toUpdate.length > 0) {
      await candleModel.bulkWrite(
        toUpdate.map((value) => ({
          updateOne: {
            filter: { id: value.id },
            update: { $set: value },
            upsert: true,
            hint: 'id_1',
          },
        })),
        { ordered: false },
      );

      await marketModel
        .updateOne(
          { symbol: candle.symbol },
          { $set: { last_price: candle.close_price } },
          { upsert: true },
        )
        .hint('symbol_1');

      await redis.del(redisKeys.candlesPersistLock);

      return toUpdate;
    }

    await redis.del(redisKeys.candlesPersistLock);

    return;
  }

  try {
    await redis.rPush(redisKeys.candles, JSON.stringify(candle));
  } catch (error: unknown) {
    if ((error as RedisError).code === 'WRONGTYPE') {
      await redis.del(redisKeys.candles);
    } else {
      throw error;
    }
  }
};

/**
 * @description Calculates indicators values of given candles and saves to database.
 */
export const processCandles = async function processCandles({
  candles,
  redis,
  database,
}: ProcessCandlesProps) {
  if (candles.length === 0) {
    return;
  }

  const candleModel: CandleModel = database.model(DATABASE_MODELS.CANDLE);
  const symbol = candles[0].symbol;
  const candlesToUpdate = candles;

  const toUpdate: LeanCandleDocument[] = await candleModel
    .find({ id: { $in: candlesToUpdate.map(({ id }) => id) } })
    .hint('id_1')
    .sort({ open_time: 1 })
    .lean();

  const updates: Record<
    string,
    string | number | boolean | null | undefined
  >[] = [];

  const ignoredFields = {
    updatedAt: false,
    createdAt: false,
    __v: false,
    quote_asset_volume: false,
    _id: false,
    open_time: false,
    close_time: false,
    date: false,
    event_time: false,
  };

  for (const candle of toUpdate) {
    const redisKeys = getRedisKeys(candle);
    const cachedCandlesValue = await redis.get(redisKeys.cachedCandles);

    let cachedCandles: LeanCandleDocument[];

    if (!cachedCandlesValue) {
      cachedCandles = await candleModel
        .find({
          $and: [
            { symbol },
            {
              open_time: {
                $gte: candle.open_time - getTimeDiff(155, candle.interval),
              },
            },
            {
              open_time: {
                $lte: candle.open_time - getTimeDiff(5, candle.interval),
              },
            },
          ],
        })
        .select(ignoredFields)
        .hint('symbol_1_open_time_1')
        .sort({ open_time: 1 })
        .lean();

      const cacheExpiresAt = candle.open_time + getTimeDiff(2, candle.interval);

      if (Date.now() < cacheExpiresAt) {
        await redis.set(
          redisKeys.cachedCandles,
          JSON.stringify(cachedCandles),
          { PXAT: cacheExpiresAt },
        );
      }
    } else {
      cachedCandles = JSON.parse(cachedCandlesValue);
    }

    const candles: LeanCandleDocument[] = await candleModel
      .find({
        $and: [
          { symbol },
          {
            open_time: {
              $gte: candle.open_time - getTimeDiff(4, candle.interval),
            },
          },
          { open_time: { $lte: candle.open_time } },
        ],
      })
      .select(ignoredFields)
      .hint('symbol_1_open_time_1')
      .sort({ open_time: 1 })
      .lean();

    const allCandles = cachedCandles.concat(candles);

    if (allCandles.length >= 150) {
      const ohlc = getOHLCValues(allCandles);
      const indicators = await getIndicatorsValues(ohlc, allCandles);
      updates.push({ id: candle.id, ...indicators });
    }
  }

  if (updates.length > 0) {
    await candleModel.bulkWrite(
      updates.map((value) => ({
        updateOne: {
          filter: { id: value.id },
          update: { $set: value },
          upsert: true,
          hint: 'id_1',
        },
      })),
      { ordered: false },
    );
  }
};

export const fillCandlesData = async function fillCandlesData({
  database,
  redis,
  binance,
}: FillCandlesDataProps) {
  const candleModel: CandleModel = database.model(DATABASE_MODELS.CANDLE);
  const marketModel: MarketModel = database.model(DATABASE_MODELS.MARKET);

  console.log('Attempting to fill candles data...');

  for (const pair of PAIRS) {
    const symbol = pair.symbol;
    const interval = CANDLE_INTERVAL;
    console.log('Current pair: ', symbol);

    const count = await candleModel
      .countDocuments({
        $and: [
          { symbol },
          { open_time: { $gte: Date.now() - getTimeDiff(155, interval) } },
          { open_time: { $lte: Date.now() } },
        ],
      })
      .hint('symbol_1_open_time_1');

    if (count < 150) {
      const query = new URLSearchParams({
        symbol,
        interval,
        startTime: (Date.now() - getTimeDiff(155, interval)).toString(),
      }).toString();

      const { data } = await binance.get<[number[]]>(`/api/v3/klines?${query}`);

      if (Array.isArray(data) && data.length > 0) {
        const processed = buildCandles({
          candles: data,
          symbol,
          interval,
        });

        await candleModel.deleteMany({ $and: [{ symbol }, { interval }] });
        await candleModel.insertMany(processed);

        const marketExists = await marketModel.exists({ symbol });

        if (!marketExists) {
          await marketModel.create({
            symbol,
            last_price: processed[processed.length - 1].close_price,
            quote_asset: pair.quoteAsset,
            base_asset: pair.baseAsset,
            price_tick_size: pair.priceTickSize,
            step_size: pair.stepSize,
            enabled: true,
          });
        }

        await processCandles({
          redis,
          binance,
          database,
          candles: processed.slice(-5),
        });
      }
    }
  }

  console.log('Finished filling candles data');
};
