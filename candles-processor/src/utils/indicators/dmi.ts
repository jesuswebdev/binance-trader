import { calculateSimpleMovingAverage, calculateTrueRange } from './';
import { nz } from '@binance-trader/shared';

type GetDMIOptions = {
  periods?: number;
  parseFn: (v: number) => number | null;
};

/**
 *
 * @summary ADX and DI by BeikabuOyaji
 */
export function calculateAverageDirectionalIndex(
  data: [number[], number[], number[]],
  { periods = 14, parseFn }: GetDMIOptions,
): {
  adx: number | null;
  plus_di: number | null;
  minus_di: number | null;
} {
  const [high, low, close] = data;

  // check every data array is the same size
  if (!data.every((array) => array.length === data[0].length)) {
    throw new Error('Data length mismatch');
  }

  const smoothedTrueRangeValues = [0];
  const smoothedPlusDMValues = [0];
  const smoothedMinusDMValues = [0];

  const plusDIValues = [];
  const minusDIValues = [];
  const dxValues = [];
  const adxValues = [];

  for (let i = 0; i < data[0].length; i++) {
    if (i === 0) {
      continue;
    }

    const { tr: trueRange } = calculateTrueRange(
      [high.slice(0, i + 1), low.slice(0, i + 1), close.slice(0, i + 1)],
      { parseFn },
    );
    const plusDM =
      high[i] - nz(high[i - 1]) > nz(low[i - 1]) - low[i]
        ? Math.max(high[i] - nz(high[i - 1]), 0)
        : 0;

    const minusDM =
      nz(low[i - 1]) - low[i] > high[i] - nz(high[i - 1])
        ? Math.max(nz(low[i - 1]) - low[i], 0)
        : 0;

    const smoothedTrueRange =
      nz(smoothedTrueRangeValues[i - 1]) -
      nz(smoothedTrueRangeValues[i - 1]) / periods +
      (trueRange as number);

    smoothedTrueRangeValues.push(smoothedTrueRange);

    const smoothedPlusDM =
      nz(smoothedPlusDMValues[i - 1]) -
      nz(smoothedPlusDMValues[i - 1]) / periods +
      plusDM;

    smoothedPlusDMValues.push(smoothedPlusDM);

    const smoothedMinusDM =
      nz(smoothedMinusDMValues[i - 1]) -
      nz(smoothedMinusDMValues[i - 1]) / periods +
      minusDM;

    smoothedMinusDMValues.push(smoothedMinusDM);

    const plusDI = (smoothedPlusDM / smoothedTrueRange) * 100;
    plusDIValues.push(plusDI);

    const minusDI = (smoothedMinusDM / smoothedTrueRange) * 100;
    minusDIValues.push(minusDI);

    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    dxValues.push(dx);

    const { sma: adx } = calculateSimpleMovingAverage(dxValues, {
      periods,
      parseFn,
    });

    adxValues.push(adx);
  }

  return {
    plus_di: plusDIValues.pop(),
    minus_di: minusDIValues.pop(),
    adx: adxValues.pop(),
  };
}
