import tulind from 'tulind';
import { getSMA } from './index';

interface getATRFunction {
  (
    data: [number[], number[], number[]],
    options: {
      periods?: number;
      sma?: boolean;
      parseFn: (v: number) => number | null;
    }
  ): Promise<{
    atr: number | null;
    atr_sma?: number | null;
  }>;
}

export const getATR: getATRFunction = function getATR(
  data: [number[], number[], number[]],
  { periods = 14, sma = true, parseFn }
) {
  return new Promise((resolve, reject) => {
    tulind.indicators.atr.indicator(
      data,
      [periods],
      async (err: unknown, [res]: [number[]]) => {
        if (err) {
          return reject(err);
        }

        const atr = res[res.length - 1] ?? null;

        if (!sma) {
          return resolve({ atr: parseFn ? parseFn(atr) : atr });
        }

        const { sma: atr_sma } = await getSMA([res], { periods: 28, parseFn });

        return resolve({ atr: parseFn ? parseFn(atr) : atr, atr_sma });
      }
    );
  });
};
