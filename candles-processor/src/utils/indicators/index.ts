export * from './atr-stop';
export * from './atr';
export * from './ch-atr';
export * from './dmi';
export * from './ema-slope';
export * from './ema';
export * from './macd';
export * from './mesa';
export * from './obv';
export * from './pump-or-dump';
export * from './rma';
export * from './sma';
export * from './supertrend';
export * from './tr';
export * from './volume-trend';

interface GenericCallback {
  (
    options: {
      reject: CallableFunction;
      resolve: CallableFunction;
      parseFn: CallableFunction;
      properties: string[];
    },
    error: unknown,
    result: [number[]]
  ): void;
}

export const genericCallback: GenericCallback = function genericCallback(
  { resolve, reject, parseFn, properties },
  error,
  result
) {
  if (error) {
    return reject(error);
  }

  const aux: Record<string, number> = {};

  properties.forEach((property, index) => {
    const res = result[index];
    const v = res[res.length - 1] ?? null;
    aux[property] = parseFn ? parseFn(v) : v;
  });

  return resolve(aux);
};