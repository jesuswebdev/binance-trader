import { ObjectSchema } from 'joi';
import { MILLISECONDS } from './constants/index';

export * from './classes/index';
export * from './constants/index';
export * from './interfaces/index';
export * from './models/index';

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
  return n === null || (typeof n === 'number' && !isNaN(n) && !isFinite(n));
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
