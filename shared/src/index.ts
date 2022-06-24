import { ObjectSchema } from 'joi';
import { PAIRS } from './busd_pairs';
import { MILLISECONDS } from './constants/index';
export * from './busd_pairs';

export * from './classes/index';
export * from './constants/index';
export * from './interfaces/index';
export * from './models/index';

export * from './binance-instance-creator';

export const validateObjectSchema = function validateObjectSchema<T>(
  obj: T,
  schema: ObjectSchema<T>,
) {
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
};

export const numberSchemaValidation = function numberSchemaValidation(
  n: number,
) {
  return n === null || (typeof n === 'number' && !isNaN(n) && isFinite(n));
};

/**
 *
 * @param candles Candle count
 * @param interval Candle interval
 * @returns The product of candles * interval (converted to milliseconds)
 * @example given candles = 5, and interval = 1m. The result would be 5 * 60000.
 */
export const getTimeDiff = function getTimeDiff(
  candles: number,
  interval: string,
) {
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
};

export const cloneObject = function cloneObject<T>(obj: T): T {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
};

/**
 *
 * @param v value to check
 * @description Asserts wether a number is valid or not.
 * Invalid values include: `undefined`, `null`, `Infinity`, `-Infinity`, `NaN`.
 */
export const numberIsValid = function numberIsValid(
  v: number | null | undefined,
) {
  return !(typeof v === 'undefined' || v === null || !isFinite(v) || isNaN(v));
};

/**
 *
 * @name Null To Zero
 * @description Replaces NaN values with zeros (or given value).
 * @param v value
 * @param d value to use if `v` is not valid
 */
export const nz = function nz(
  v: number | null | undefined,
  d?: number,
): number {
  return !numberIsValid(v) ? d ?? 0 : (v as number);
};

const toFixedPrecision = function toFixedPrecision(n: number, digits = 8) {
  return +n.toPrecision(digits);
};

const getResult = function getResult(value: number, tick: number) {
  return Math.trunc(toFixedPrecision(value / tick)) / Math.ceil(1 / tick);
};

const getSymbolPrecision = function getSymbolPrecision(
  symbol: string,
  type: 'priceTickSize' | 'stepSize',
) {
  return (PAIRS.find((p) => p.symbol === symbol) || {})[type];
};

/**
 * Returns the price fixed to the symbol's precision point
 * @param {Number} value Price
 * @param {String} symbol Symbol
 */
export const toSymbolPrecision = function toSymbolPrecision(
  value: number,
  symbol: string,
) {
  const tick = getSymbolPrecision(symbol, 'priceTickSize') ?? 0;

  return getResult(value, tick);
};

export const toSymbolStepPrecision = function toSymbolStepPrecision(
  value: number,
  symbol: string,
) {
  const tick = getSymbolPrecision(symbol, 'stepSize') ?? 0;

  return getResult(value, tick);
};

/**
 *
 * @param value
 * @description Returns `true` if the given `value` is equal to `true`, `'true'`, or `1` and `false` otherwise.
 */
export const getBooleanValue = function getBooleanValue(
  value: string | boolean | number | null | undefined,
) {
  const isString = typeof value === 'string';
  const isBoolean = typeof value === 'boolean';
  const isNumber = typeof value === 'number';

  if (isBoolean) {
    return value;
  }

  if (isString) {
    return value === 'true';
  }

  if (isNumber) {
    return value === 1;
  }

  return false;
};
