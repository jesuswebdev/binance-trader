import { LeanCandleDocument } from '@binance-trader/shared';

export function getHeikenAshi(candles: LeanCandleDocument[]) {
  const [previousCandle, currentCandle] = candles.slice(-2);

  const close =
    (currentCandle.open_price +
      currentCandle.high_price +
      currentCandle.low_price +
      currentCandle.close_price) /
    4;
  const open =
    previousCandle && previousCandle.ha_open && previousCandle.ha_close
      ? (previousCandle.ha_open + previousCandle.ha_close) / 2
      : (currentCandle.open_price + currentCandle.close_price) / 2;

  const high = Math.max(currentCandle.high_price, close, open);
  const low = Math.min(currentCandle.low_price, close, open);

  return { ha_open: open, ha_close: close, ha_high: high, ha_low: low };
}
