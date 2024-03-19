import {
  LeanCandleDocument,
  LeanPositionDocument,
  SIGNAL_TYPES,
  toSymbolPrecision,
} from '@binance-trader/shared';

export const applyStrategy = function applyStrategy(
  candles: LeanCandleDocument[],
  last_open_position?: LeanPositionDocument,
) {
  const [previousCandle, currentCandle] = candles.slice(-2);

  if (!previousCandle || !currentCandle) {
    return;
  }

  const volume = currentCandle.obv > currentCandle.obv_ema;

  const volatile = currentCandle.ch_atr > currentCandle.ch_atr_ema;

  const position_prices = [
    last_open_position?.buy_price ?? 0,
    last_open_position?.sell_price ?? 0,
  ].filter((notFalsy) => notFalsy);

  const highest_price = Math.max(0, ...position_prices);

  if (
    !!highest_price &&
    currentCandle.close_price > highest_price - currentCandle.atr * 3
  ) {
    return;
  }

  const di =
    currentCandle.adx > 20 &&
    currentCandle.plus_di > 25 &&
    currentCandle.plus_di > currentCandle.minus_di;

  const above_ema = currentCandle.close_price > currentCandle.ema_50;
  const upward_slope = candles
    .slice(-3)
    .every((candle) => candle.ema_50_slope === 1);
  const green_candles = candles
    .slice(-2)
    .every((candle) => candle.ha_close > candle.ha_open);

  const trending =
    previousCandle.trend === 1 &&
    previousCandle.mama > previousCandle.fama &&
    currentCandle.trend === 1 &&
    currentCandle.mama > currentCandle.fama &&
    previousCandle.volume_trend === 1 &&
    currentCandle.volume_trend === 1 &&
    above_ema &&
    upward_slope &&
    green_candles;

  // more than 5% in the last hour
  const highestHigh = Math.max(
    ...candles.slice(-4).map((candle) => candle.high_price),
    -Infinity,
  );
  const lowestLow = Math.min(
    ...candles.slice(-4).map((candle) => candle.low_price),
    Infinity,
  );

  const notARecentPump = 100 - (lowestLow * 100) / highestHigh < 5;

  const triggerSignal = volume && volatile && trending && di && notARecentPump;

  if (!triggerSignal) {
    return;
  }

  return {
    symbol: currentCandle.symbol,
    price: toSymbolPrecision(currentCandle.close_price, currentCandle.symbol),
    date: new Date(currentCandle.event_time || currentCandle.open_time),
    trigger_time: new Date(
      currentCandle.event_time || currentCandle.open_time,
    ).getTime(),
    interval: currentCandle.interval,
    trigger: 'trend_and_volume',
    time: Date.now(),
    type: SIGNAL_TYPES.BUY,
  };
};
