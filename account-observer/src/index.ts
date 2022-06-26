import getBinanceInstance from '@binance-trader/shared/build/binance-instance-creator';
import { BINANCE_API_KEY, BINANCE_API_SECRET, BINANCE_API_URL } from './config';
import { initDb } from './config/database';
import Observer from './observer';

const start = async () => {
  const db = await initDb();

  const binance = getBinanceInstance({
    apiUrl: BINANCE_API_URL,
    apiKey: BINANCE_API_KEY,
    apiSecret: BINANCE_API_SECRET,
  });

  const observer = new Observer(db, binance);

  observer.init();
};

start();
