import { LeanCandleDocument, nz } from '@binance-trader/shared';
import { getATR } from '.';
import { OHLC } from '../interfaces';

interface getSupertrendFunction {
  (
    candles: LeanCandleDocument[],
    ohlc: OHLC,
    options: { parseFn: (v: number) => number | null },
  ): Promise<
    { trend: number; trend_up: number; trend_down: number } | undefined
  >;
}

export const getSupertrend: getSupertrendFunction =
  async function getSupertrend(candles, ohlc, { parseFn }) {
    if (candles.length === 1) {
      return;
    }

    const { high, low, close, hl2 } = ohlc;

    const factor = 3;
    const pd = 7;

    const { atr } = (await getATR([high, low, close], {
      periods: pd,
      parseFn,
    })) as Record<string, number>;

    const up = hl2[hl2.length - 1] - factor * atr;
    const dn = hl2[hl2.length - 1] + factor * atr;

    const trend_up = parseFn(
      close[close.length - 2] >
        (candles[candles.length - 2]?.trend_up ?? -Infinity)
        ? Math.max(up, candles[candles.length - 2]?.trend_up ?? -Infinity)
        : up,
    ) as number;

    const trend_down = parseFn(
      close[close.length - 2] <
        (candles[candles.length - 2]?.trend_down ?? Infinity)
        ? Math.min(dn, candles[candles.length - 2]?.trend_down ?? Infinity)
        : dn,
    ) as number;

    let trend = 0;

    if (
      close[close.length - 1] >
      (candles[candles.length - 2]?.trend_down ?? -Infinity)
    ) {
      trend = 1;
    } else if (
      close[close.length - 2] <
      (candles[candles.length - 2]?.trend_up ?? Infinity)
    ) {
      trend = -1;
    } else {
      trend = nz(candles[candles.length - 2]?.trend, 1);
    }

    return { trend, trend_up, trend_down };
  };
