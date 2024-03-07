import { PAIRS } from '@binance-trader/shared';
import { CANDLE_INTERVAL, HEALTHCHECK_PORT } from './config';
import { Observer } from './observer';
import http from 'http';

const start = () => {
  http
    .createServer(function (_, res) {
      res.statusCode = 200;
      res.write('OK');
      res.end();
    })
    .listen(HEALTHCHECK_PORT);

  const observer = new Observer({
    markets: PAIRS,
    interval: CANDLE_INTERVAL,
  });

  observer.init();
};

start();
