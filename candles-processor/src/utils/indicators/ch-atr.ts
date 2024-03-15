import { LeanCandleDocument, nz } from '@binance-trader/shared';
import { OHLC } from '../interfaces';
import {
  calculateTrueRange,
  calculateRollingMovingAverage,
  calculateExponentialMovingAverage,
} from './index';

export function getCHATR(
  candles: LeanCandleDocument[],
  ohlc: OHLC,
): {
  ch_atr: number;
  ch_atr_ema: number;
} {
  if (candles.length === 1) {
    return;
  }

  const { tr } = calculateTrueRange([ohlc.high, ohlc.low, ohlc.close], {
    all: true,
    parseFn: nz,
  }) as Record<string, number[]>;

  const { rma } = calculateRollingMovingAverage(tr, {
    periods: 10,
    parseFn: nz,
  });
  const atrp = rma.map((range, i) => (range / ohlc.close[i]) * 100);
  const { ema: avg } = calculateExponentialMovingAverage(atrp, {
    periods: 28,
    parseFn: nz,
  }) as Record<string, number>;

  return {
    ch_atr_ema: avg,
    ch_atr: atrp[atrp.length - 1],
  };
}
