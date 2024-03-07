import getBinanceInstance from '@binance-trader/shared/build/binance-instance-creator';
import {
  BINANCE_API_KEY,
  BINANCE_API_SECRET,
  BINANCE_API_URL,
  HEALTHCHECK_PORT,
} from './config';
import { initDb } from './config/database';
import Observer from './observer';
import http from 'http';

const start = async () => {
  http
    .createServer(function (_, res) {
      res.statusCode = 200;
      res.write('OK');
      res.end();
    })
    .listen(HEALTHCHECK_PORT);

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
