import tulind from 'tulind';

interface getTRFunction {
  (
    data: [number[], number[], number[]],
    options: {
      all?: boolean;
      parseFn: (v: number) => number | null;
    }
  ): Promise<{ tr: number | number[] }>;
}

/**
 * @summary True Range
 */
export const getTR: getTRFunction = function getTR(data, { all, parseFn }) {
  return new Promise((resolve, reject) => {
    tulind.indicators.tr.indicator(
      data,
      [],
      (err: unknown, [res]: [number[]]) => {
        if (err) {
          return reject(err);
        }

        const tr = res[res.length - 1] ?? null;

        if (all) {
          const values = res ?? [];

          return resolve({
            tr: parseFn ? (values.map(parseFn) as number[]) : values
          });
        }

        return resolve({ tr: parseFn ? (parseFn(tr) as number) : tr });
      }
    );
  });
};
