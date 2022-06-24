import { PAIRS } from '@binance-trader/shared';
import { CANDLE_INTERVAL } from './config';
import { Observer } from './observer';

const start = () => {
  const observer = new Observer({
    markets: PAIRS,
    interval: CANDLE_INTERVAL,
  });

  observer.init();
};

start();
