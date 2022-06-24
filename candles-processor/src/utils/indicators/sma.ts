import tulind from 'tulind';
import { genericCallback } from '.';

interface getSMAFunction {
  (
    data: [number[]],
    options: {
      periods?: number;
      parseFn: (v: number) => number | null;
    },
  ): Promise<{ sma: number | null }>;
}

export const getSMA: getSMAFunction = function getSMA(
  data,
  { periods = 28, parseFn },
) {
  return new Promise((resolve, reject) => {
    tulind.indicators.sma.indicator(
      data,
      [periods],
      genericCallback.bind(null, {
        resolve,
        reject,
        parseFn,
        properties: ['sma'],
      }),
    );
  });
};
