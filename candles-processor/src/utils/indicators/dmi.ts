import tulind from 'tulind';
import { genericCallback } from './';

interface tulindFunction<T> {
  (
    data: [number[], number[], number[]],
    options: {
      periods?: number;
      parseFn: (v: number) => number | null;
    }
  ): Promise<T>;
}

const getADX: tulindFunction<{ adx: number | null }> = function getADX(
  data,
  { periods = 14, parseFn }
) {
  return new Promise((resolve, reject) => {
    tulind.indicators.adx.indicator(
      data,
      [periods],
      genericCallback.bind(null, {
        reject,
        resolve,
        parseFn,
        properties: ['adx']
      })

      //   (err: unknown, [res]: [number[]]) => {
      //     if (err) {
      //       return reject(err);
      //     }

      //     const adx = res[res.length - 1] ?? null;

      //     return resolve(validateValue(res.pop()));
      //   }
    );
  });
};

const getDI: tulindFunction<{
  plus_di: number | null;
  minus_di: number | null;
}> = function getDI(data, { periods = 14, parseFn }) {
  return new Promise((resolve, reject) => {
    tulind.indicators.di.indicator(
      data,
      [periods],
      genericCallback.bind(null, {
        reject,
        resolve,
        parseFn,
        properties: ['plus_di', 'minus_di']
      })
      //     (err, res) => {
      //   if (err) {
      //     return reject(err);
      //   }
      //   return resolve({
      //     plus_di: validateValue(res[0].pop()),
      //     minus_di: validateValue(res[1].pop())
      //   });
      // }
    );
  });
};

export const getDMI: tulindFunction<{
  adx: number | null;
  plus_di: number | null;
  minus_di: number | null;
}> = async function getDMI(data, { periods = 14, parseFn }) {
  const { adx } = await getADX(data, { periods, parseFn });
  const di = await getDI(data, { periods, parseFn });

  return { adx, ...di };
};
