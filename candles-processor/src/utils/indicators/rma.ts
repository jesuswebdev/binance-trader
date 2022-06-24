import { nz } from '@binance-trader/shared';
import { getSMA } from '.';

interface getRMAFunction {
  (
    data: number[],
    options: {
      periods: number;
      parseFn: (v: number) => number | null;
    },
  ): Promise<{ rma: number[] }>;
}

/**
 *
 * @summary Rolling Moving Average
 */

export const getRMA: getRMAFunction = async function getRMA(
  data,
  { periods, parseFn },
) {
  const alpha = 1 / periods;

  const sum: number[] = [];

  for (const item of data) {
    const previous = sum[sum.length - 1];
    const nan = isNaN(previous as number);
    const src = data.slice(0, sum.length + 1);
    let value: number;

    if (nan) {
      const { sma } = await getSMA([src], { periods, parseFn });
      value = sma as number;
    } else {
      value = parseFn(alpha * item + (1 - alpha) * nz(previous)) as number;
    }
    sum.push(value);
  }

  return { rma: sum };
};
