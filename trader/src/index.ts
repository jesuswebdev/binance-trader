import { EXCHANGE_TYPES, MessageBroker } from '@binance-trader/shared';
import getBinanceInstance from '@binance-trader/shared/build/binance-instance-creator';
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL,
  MESSAGE_BROKER_URI,
} from './config';
import { initDb } from './config/database';

const start = async () => {
  const binance = getBinanceInstance({
    apiUrl: BINANCE_API_URL,
    apiKey: BINANCE_API_KEY,
    apiSecret: BINANCE_API_SECRET,
  });

  const broker = new MessageBroker({
    exchange: EXCHANGE_TYPES.MAIN,
    uri: MESSAGE_BROKER_URI,
    queue: 'candles-processor',
  });

  const [db] = await Promise.all([initDb(), broker.initializeConnection()]);

  console.log(binance, db);

  // position created
  // position closed
  // position closed-requeue (unfilled sell order)
};

start();
