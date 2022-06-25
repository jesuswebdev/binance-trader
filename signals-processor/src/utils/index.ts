import { CandleAttributes } from '@binance-trader/shared';

export const getPlainCandle = function getPlainCandle(
  obj: CandleAttributes,
  //eslint-disable-next-line
): Record<string, any> {
  const nono = ['signals', '_id', '__v', 'createdAt', 'updatedAt'];
  //eslint-disable-next-line
  const aux: Record<string, any> = {};

  for (const key in obj) {
    if (!nono.includes(key)) {
      aux[key] = obj[key as keyof CandleAttributes];
    }
  }

  return aux;
};
