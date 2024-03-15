import { nz } from '@binance-trader/shared';
import { calculateSimpleMovingAverage } from '.';

type GetRMAOptions = {
  periods: number;
  parseFn: (v: number) => number | null;
};

type GetRMAFunctionReturnValue = { rma: number[] };

/**
 *
 * @summary Rolling Moving Average
 */

export function calculateRollingMovingAverage(
  data: number[],
  { periods, parseFn }: GetRMAOptions,
): GetRMAFunctionReturnValue {
  const alpha = 1 / periods;

  const sum: number[] = [];

  for (const item of data) {
    const previous = sum[sum.length - 1];
    const nan = isNaN(previous as number);
    const src = data.slice(0, sum.length + 1);
    let value: number;

    if (nan) {
      const { sma } = calculateSimpleMovingAverage(src, { periods, parseFn });
      value = sma as number;
    } else {
      value = parseFn(alpha * item + (1 - alpha) * nz(previous)) as number;
    }
    sum.push(value);
  }

  return { rma: sum };
}
