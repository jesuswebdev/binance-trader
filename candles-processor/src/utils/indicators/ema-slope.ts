import { OHLC } from '../interfaces';
import { getEMA } from './index';
import { nz } from '@binance-trader/shared';

interface getEMASlopeFunction {
  (data: OHLC, options: { parseFn: (v: number) => number | null }): Promise<{
    ema_50: number | null;
    ema_50_slope: number | null;
  }>;
}

export const getEMASlope: getEMASlopeFunction = async function getEMASlope(
  ohlc,
  { parseFn },
) {
  const { hl2 } = ohlc;
  const periods = 50;

  const { ema } = (await getEMA([hl2], {
    periods,
    all: true,
    parseFn,
  })) as Record<string, number[]>;
  let slope = 0;
  let previous = 0;

  for (const value of ema) {
    slope = nz(value / previous) > 1 ? 1 : -1;
    previous = value;
  }

  return { ema_50: ema[ema.length - 1], ema_50_slope: slope };
};
