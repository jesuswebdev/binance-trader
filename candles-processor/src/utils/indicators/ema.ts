import tulind from 'tulind';

interface getEMAFunction {
  (
    data: [number[]],
    options: {
      periods?: number;
      all?: boolean;
      parseFn: (v: number) => number | null;
    }
  ): Promise<{ ema: number | number[] | null }>;
}

export const getEMA: getEMAFunction = function getEMA(
  data,
  { periods = 5, all = false, parseFn }
) {
  return new Promise((resolve, reject) => {
    tulind.indicators.ema.indicator(
      data,
      [periods],
      (err: unknown, [res]: [number[]]) => {
        if (err) {
          return reject(err);
        }

        const ema = res[res.length - 1] ?? null;

        if (all) {
          const values = res ?? [];

          return resolve({
            ema: parseFn ? (values.map(parseFn) as number[]) : values
          });
        }

        return resolve({ ema: parseFn ? parseFn(ema) : ema });
      }
    );
  });
};