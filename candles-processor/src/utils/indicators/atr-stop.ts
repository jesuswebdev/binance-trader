import { LeanCandleDocument, nz } from '@binance-trader/shared';
import { OHLC } from '../interfaces';
import { calculateAverageTrueRange } from './atr';

export function getATRStop(
  candles: LeanCandleDocument[],
  ohlc: OHLC,
  { parseFn }: { parseFn: (v: number) => number | null },
): { atr_stop: number } | undefined {
  if (candles.length === 1) {
    return;
  }

  const factor = 3.5;
  const pd = 5;

  const { atr } = calculateAverageTrueRange([ohlc.high, ohlc.low, ohlc.close], {
    periods: pd,
    parseFn,
    sma: false,
  });
  const loss = (atr as number) * factor;

  const [previous_candle] = candles.slice(-2);
  const [previous_close, current_close] = ohlc.close.slice(-2);

  let atr_stop = 0;

  if (
    current_close > (parseFn(nz(previous_candle.atr_stop)) as number) &&
    previous_close > (parseFn(nz(previous_candle.atr_stop)) as number)
  ) {
    atr_stop = parseFn(
      Math.max(nz(previous_candle.atr_stop), current_close - loss),
    ) as number;
  } else if (
    current_close < (parseFn(nz(previous_candle.atr_stop)) as number) &&
    previous_close < (parseFn(nz(previous_candle.atr_stop)) as number)
  ) {
    atr_stop = parseFn(
      Math.min(nz(previous_candle.atr_stop), current_close + loss),
    ) as number;
  } else if (
    current_close > (parseFn(nz(previous_candle.atr_stop)) as number)
  ) {
    atr_stop = parseFn(current_close - loss) as number;
  } else {
    atr_stop = parseFn(current_close + loss) as number;
  }

  return { atr_stop };
}
