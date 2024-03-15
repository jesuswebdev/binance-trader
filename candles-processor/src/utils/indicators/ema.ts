import { calculateSimpleMovingAverage } from './sma';
import { nz } from '@binance-trader/shared';

type GetEMAOptions = {
  periods?: number;
  all?: boolean;
  parseFn: (v: number) => number | null;
};

type GetEMAFunctionReturnValue = { ema: number | number[] | null };

export function calculateExponentialMovingAverage(
  data: number[],
  { periods = 5, all = false, parseFn }: GetEMAOptions,
): GetEMAFunctionReturnValue {
  const prevSma = data.slice(0, periods);

  const { sma } = calculateSimpleMovingAverage(prevSma, { periods, parseFn });

  const multiplier = nz(2 / (periods + 1));

  const previousEMA = [sma];

  for (let i = periods; i < data.length; i++) {
    const ema =
      data[i] * multiplier +
      previousEMA[previousEMA.length - 1] * (1 - multiplier);

    previousEMA.push(ema);
  }

  if (all) {
    return { ema: parseFn ? previousEMA.map(parseFn) : previousEMA };
  }

  return {
    ema: parseFn
      ? parseFn(previousEMA[previousEMA.length - 1])
      : previousEMA[previousEMA.length - 1],
  };
}
