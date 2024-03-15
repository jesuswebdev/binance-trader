import { nz } from '@binance-trader/shared';

type GetSMAFunctionReturnValue = { sma: number | null };

export function calculateSimpleMovingAverage(
  data: number[],
  { periods = 28, parseFn },
): GetSMAFunctionReturnValue {
  let sum = 0;

  for (const item of data.slice(-periods)) {
    sum += nz(item);
  }

  return { sma: parseFn(sum / periods) };
}
