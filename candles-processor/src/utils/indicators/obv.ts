import { calculateExponentialMovingAverage } from './index';

type GetOBVOptions = {
  ema?: boolean;
  parseFn: (v: number) => number | null;
};

type GetOBVFunctionReturnValue = {
  obv: number | null;
  obv_ema?: number | null;
};

export function calculateOnBalanceVolume(
  data: [number[], number[]],
  { ema = true, parseFn }: GetOBVOptions,
): GetOBVFunctionReturnValue {
  const [close, volume] = data;

  if (close.length !== volume.length) {
    throw new Error('Data length mismatch');
  }

  const obv = [];

  for (let i = 0; i < close.length; i++) {
    if (i === 0) {
      obv.push(0);
      continue;
    }

    // If today's close is greater than yesterday's close then: OBV = Yesterday’s OBV + Today’s Volume
    if (close[i] > close[i - 1]) {
      obv.push(obv[i - 1] + volume[i]);
    } else if (close[i] < close[i - 1]) {
      // If today’s close is less than yesterday’s close then: OBV = Yesterday’s OBV – Today’s Volume
      obv.push(obv[i - 1] - volume[i]);
    } else {
      // If today’s close is equal to yesterday’s close then: OBV = Yesterday’s OBV
      obv.push(obv[i - 1]);
    }
  }

  if (!ema) {
    return {
      obv: parseFn ? parseFn(obv[obv.length - 1]) : obv[obv.length - 1],
    };
  }

  const { ema: obv_ema } = calculateExponentialMovingAverage(obv, {
    periods: 28,
    parseFn,
  });

  return {
    obv: parseFn ? parseFn(obv[obv.length - 1]) : obv[obv.length - 1],
    obv_ema: obv_ema as number,
  };
}
