import { OHLC } from '../interfaces';
import { nz } from '@binance-trader/shared';
import { calculateExponentialMovingAverage } from './ema';

type GetEMASlopeOptions = { parseFn: (v: number) => number | null };

type GetEmaSlopeFunctionReturnValue = {
  ema_50: number | null;
  ema_50_slope: number | null;
};

export function getEMASlope(
  ohlc: OHLC,
  { parseFn }: GetEMASlopeOptions,
): GetEmaSlopeFunctionReturnValue {
  const periods = 50;

  const { ema } = calculateExponentialMovingAverage(ohlc.hl2, {
    periods,
    all: true,
    parseFn,
  }) as Record<string, number[]>;

  let slope = 0;
  let previous = 0;

  for (const value of ema) {
    slope = nz(value / previous) > 1 ? 1 : -1;
    previous = value;
  }

  return { ema_50: ema[ema.length - 1], ema_50_slope: slope };
}
