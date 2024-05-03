import { ObjectSchema } from 'joi';
import { ALL_PAIRS as PAIRS } from './all_pairs';
import { MILLISECONDS } from './constants/index';
export { ALL_PAIRS as PAIRS } from './all_pairs';

export * from './classes/index';
export * from './constants/index';
export * from './interfaces/index';
export * from './models/index';

export * from './binance-instance-creator';

export function validateObjectSchema<T>(obj: T, schema: ObjectSchema<T>) {
  const { value, error } = schema
    .label('Object to validate')
    .options({ stripUnknown: true })
    .validate(obj);

  if (error) {
    throw new Error(error.stack);
  }

  if (!value) {
    throw new Error('Object could not be validated');
  }

  return value;
}

export function numberSchemaValidation(number: number) {
  return (
    number === null ||
    (typeof number === 'number' && !isNaN(number) && isFinite(number))
  );
}

/**
 *
 * @param candles Candle count
 * @param interval Candle interval
 * @returns The product of candles * interval (converted to milliseconds)
 * @example given candles = 5, and interval = 1m. The result would be 5 * 60000.
 */
export function getTimeDiff(candles: number, interval: string) {
  let ms = 0;

  if (interval === '1d') {
    ms = MILLISECONDS.DAY;
  } else if (interval === '4h') {
    ms = MILLISECONDS.HOUR * 4;
  } else if (interval === '1h') {
    ms = MILLISECONDS.HOUR;
  } else if (interval === '15m') {
    ms = MILLISECONDS.MINUTE * 15;
  } else if (interval === '5m') {
    ms = MILLISECONDS.MINUTE * 5;
  } else if (interval === '1m') {
    ms = MILLISECONDS.MINUTE;
  }

  return ms * candles;
}

export function cloneObject<T>(obj: T): T {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}

/**
 *
 * @param v value to check
 * @description Asserts wether a number is valid or not.
 * Invalid values include: `undefined`, `null`, `Infinity`, `-Infinity`, `NaN`.
 */
export function numberIsValid(
  value: number | string | null | undefined,
): boolean {
  return (
    typeof value !== 'undefined' &&
    value !== null &&
    isFinite(+value) &&
    !isNaN(+value)
  );
}

/**
 *
 * @name Null To Zero
 * @description Replaces NaN values with zeros (or given value).
 * @param v value
 * @param d value to use if `v` is not valid
 */
export function nz(
  value: number | null | undefined,
  defaultValue?: number,
): number {
  return !numberIsValid(value) ? defaultValue ?? 0 : (value as number);
}

function toFixedPrecision(number: number, digits = 8) {
  return +number.toPrecision(digits);
}

function getResult(value: number, tick: number) {
  return Math.trunc(toFixedPrecision(value / tick)) / Math.ceil(1 / tick);
}

function getSymbolPrecision(
  symbol: string,
  type: 'priceTickSize' | 'stepSize',
) {
  return (PAIRS.find((pair) => pair.symbol === symbol) || {})[type];
}

/**
 * Returns the price fixed to the symbol's precision point
 * @param {Number} value Price
 * @param {String} symbol Symbol
 */
export function toSymbolPrecision(value: number, symbol: string) {
  const tick = getSymbolPrecision(symbol, 'priceTickSize') ?? 0;

  return getResult(value, tick);
}

export function toSymbolStepPrecision(value: number, symbol: string) {
  const tick = getSymbolPrecision(symbol, 'stepSize') ?? 0;

  return getResult(value, tick);
}

/**
 *
 * @param value
 * @description Returns `true` if the given `value` is equal to `true`, `'true'`, or `1` and `false` otherwise.
 */
export function getBooleanValue(
  value: string | boolean | number | null | undefined,
) {
  if (typeof value === 'string') {
    return value === 'true';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return Boolean(value);
  }

  return false;
}

export function getChange(currentValue: number, fromValue: number): number {
  return +((currentValue * 100) / fromValue - 100).toFixed(2);
}
