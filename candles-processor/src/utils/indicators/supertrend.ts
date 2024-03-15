import { LeanCandleDocument, nz } from '@binance-trader/shared';
import { OHLC } from '../interfaces';
import { calculateAverageTrueRange } from './atr';

type GetSupertrendOptions = { parseFn: (v: number) => number | null };

type GetSupertrendFunctionReturnValue =
  | { trend: number; trend_up: number; trend_down: number }
  | undefined;

export function getSupertrend(
  candles: LeanCandleDocument[],
  ohlc: OHLC,
  { parseFn }: GetSupertrendOptions,
): GetSupertrendFunctionReturnValue {
  if (candles.length === 1) {
    return;
  }

  const factor = 3;
  const pd = 7;

  const { atr } = calculateAverageTrueRange([ohlc.high, ohlc.low, ohlc.close], {
    periods: pd,
    parseFn,
    sma: false,
  }) as Record<string, number>;

  const up = ohlc.hl2[ohlc.hl2.length - 1] - factor * atr;
  const dn = ohlc.hl2[ohlc.hl2.length - 1] + factor * atr;

  const trend_up = parseFn(
    ohlc.close[ohlc.close.length - 2] >
      (candles[candles.length - 2]?.trend_up ?? -Infinity)
      ? Math.max(up, candles[candles.length - 2]?.trend_up ?? -Infinity)
      : up,
  ) as number;

  const trend_down = parseFn(
    ohlc.close[ohlc.close.length - 2] <
      (candles[candles.length - 2]?.trend_down ?? Infinity)
      ? Math.min(dn, candles[candles.length - 2]?.trend_down ?? Infinity)
      : dn,
  ) as number;

  let trend = 0;

  if (
    ohlc.close[ohlc.close.length - 1] >
    (candles[candles.length - 2]?.trend_down ?? -Infinity)
  ) {
    trend = 1;
  } else if (
    ohlc.close[ohlc.close.length - 2] <
    (candles[candles.length - 2]?.trend_up ?? Infinity)
  ) {
    trend = -1;
  } else {
    trend = nz(candles[candles.length - 2]?.trend, 1);
  }

  return { trend, trend_up, trend_down };
}
