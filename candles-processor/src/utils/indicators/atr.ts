import { calculateSimpleMovingAverage, calculateTrueRange } from './index';

type GetATROptions = {
  periods?: number;
  sma?: boolean;
  parseFn: (v: number) => number | null;
};

type GetATRFunctionReturnValue = {
  atr: number | null;
  atr_sma?: number | null;
};

export function calculateAverageTrueRange(
  data: [number[], number[], number[]],
  { periods = 14, sma = true, parseFn }: GetATROptions,
): GetATRFunctionReturnValue {
  const calculatedATR = [];

  let sumTR = 0;

  // calculate TR for all days
  for (let i = 0; i < periods; i++) {
    const sliceIndex = data[0].length - 1 - (periods - i);

    const { tr } = calculateTrueRange(
      [
        data[0].slice(sliceIndex, sliceIndex + 2),
        data[1].slice(sliceIndex, sliceIndex + 2),
        data[2].slice(sliceIndex, sliceIndex + 2),
      ],
      { parseFn },
    );

    sumTR += tr as number;
  }

  // calculate previous day ATR
  calculatedATR.push(sumTR * (1 / periods));

  for (let i = 0; i < periods; i++) {
    const sliceIndex = data[0].length - 1 - (periods - i);

    const { tr: currentTR } = calculateTrueRange(
      [
        data[0].slice(sliceIndex, sliceIndex + 2),
        data[1].slice(sliceIndex, sliceIndex + 2),
        data[2].slice(sliceIndex, sliceIndex + 2),
      ],
      { parseFn },
    );

    const currentATR =
      (calculatedATR[calculatedATR.length - 1] * (periods - 1) +
        (currentTR as number)) /
      periods;

    calculatedATR.push(currentATR);
  }

  if (!sma) {
    return {
      atr: parseFn
        ? parseFn(calculatedATR[calculatedATR.length - 1])
        : calculatedATR[calculatedATR.length - 1],
    };
  }

  const { sma: atr_sma } = calculateSimpleMovingAverage(calculatedATR, {
    periods: 28,
    parseFn,
  });

  return {
    atr: parseFn(calculatedATR[calculatedATR.length - 1]),
    atr_sma,
  };
}
