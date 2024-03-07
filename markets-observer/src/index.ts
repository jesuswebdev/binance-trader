import { PAIRS } from '@binance-trader/shared';
import { CANDLE_INTERVAL, HEALTHCHECK_PORT } from './config';
import { Observer } from './observer';
import http from 'http';
import logger from './utils/logger';

http
  .createServer(function (_, res) {
    res.statusCode = 200;
    res.write('OK');
    res.end();
  })
  .listen(HEALTHCHECK_PORT)
  .on('error', (error) => logger.error(error))
  .on('listening', () => {
    const observer = new Observer({
      markets: PAIRS,
      interval: CANDLE_INTERVAL,
    });

    observer.init();
  });
