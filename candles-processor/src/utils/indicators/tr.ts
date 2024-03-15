import { nz } from '@binance-trader/shared';

type GetTROptions = {
  all?: boolean;
  parseFn: (v: number) => number | null;
};

type GetTRFunctionReturnValue = { tr: number | number[] };

/**
 * @summary True Range
 */
export function calculateTrueRange(
  data: [number[], number[], number[]],
  { all, parseFn }: GetTROptions,
): GetTRFunctionReturnValue {
  // check every data array is the same size
  if (!data.every((array) => array.length === data[0].length)) {
    throw new Error('Data length mismatch');
  }

  const [high, low, close] = data;

  const tr = [];

  for (let i = 0; i < high.length; i++) {
    if (i === 0) {
      continue;
    }

    tr.push(
      Math.max(
        nz(high[i]) - nz(low[i]),
        Math.abs(nz(low[i]) - nz(close[i - 1])),
        Math.abs(nz(high[i]) - nz(close[i - 1])),
      ),
    );
  }

  if (all) {
    return { tr: parseFn ? tr.map(parseFn) : tr };
  }

  return { tr: parseFn ? parseFn(tr[tr.length - 1]) : tr[tr.length - 1] };
}
