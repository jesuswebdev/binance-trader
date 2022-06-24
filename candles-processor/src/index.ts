import {
  CandleTickData,
  CANDLE_EVENTS,
  EXCHANGE_TYPES,
  MessageBroker,
} from '@binance-trader/shared';
import getBinanceInstance from '@binance-trader/shared/build/binance-instance-creator';
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL,
  MESSAGE_BROKER_URI,
} from './config';
import { initDb } from './config/database';
import { initRedis } from './config/redis';
import {
  fillCandlesData,
  processCandles,
  processCandleTick,
} from './entity/candle/controller';

const start = async () => {
  const binance = getBinanceInstance({
    apiUrl: BINANCE_API_URL,
    apiKey: BINANCE_API_KEY,
    apiSecret: BINANCE_API_SECRET,
  });

  const broker = new MessageBroker<CandleTickData>({
    exchange: EXCHANGE_TYPES.MAIN,
    uri: MESSAGE_BROKER_URI,
    queue: 'candles-processor',
  });

  const [db, redis] = await Promise.all([
    initDb(),
    initRedis(),
    broker.initializeConnection(),
  ]);

  const msgHandler = async (data: CandleTickData) => {
    const candles = await processCandleTick({
      binance,
      database: db,
      redis,
      candle: data,
    });

    if (candles && candles.length > 0) {
      await processCandles({ binance, database: db, redis, candles });

      broker.publish(CANDLE_EVENTS.CANDLE_PROCESSED, data);
    }
  };

  broker
    .listen(CANDLE_EVENTS.CANDLE_TICK, msgHandler)
    .catch((error: unknown) => {
      console.error(error);
      throw error;
    });

  await fillCandlesData({ database: db, redis, binance });
};

start();
