import tulind from 'tulind';
import { getEMA } from './index';

interface getOBVFunction {
  (
    data: [number[], number[]],
    options: {
      ema?: boolean;
      parseFn: (v: number) => number | null;
    }
  ): Promise<{
    obv: number | null;
    obv_ema?: number | null;
  }>;
}

export const getOBV: getOBVFunction = function getOBV(
  data,
  { ema = true, parseFn }
) {
  return new Promise((resolve, reject) => {
    tulind.indicators.obv.indicator(
      data,
      [],
      async (err: unknown, [res]: [number[]]) => {
        if (err) {
          return reject(err);
        }

        const obv = res[res.length - 1] ?? null;

        if (!ema) {
          return resolve({ obv: parseFn ? parseFn(obv) : obv });
        }

        const { ema: obv_ema } = (await getEMA([res], {
          periods: 28,
          parseFn
        })) as Record<string, number>;

        return resolve({ obv: parseFn(obv), obv_ema });
      }
    );
  });
};
