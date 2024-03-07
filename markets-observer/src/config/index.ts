import dotenv from 'dotenv';
import path from 'path';
import joi from 'joi';
import {
  validateObjectSchema,
  ENVIRONMENT_TYPES,
} from '@binance-trader/shared';

dotenv.config({
  path: path.resolve(
    __dirname,
    `../../.env.${process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT}`,
  ),
});

const env = validateObjectSchema(
  process.env,
  joi.object({
    CANDLE_INTERVAL: joi.string().trim().required(),
    BINANCE_STREAM_URI: joi.string().trim().uri().required(),
    MESSAGE_BROKER_PROTOCOL: joi.string().trim().required(),
    MESSAGE_BROKER_HOST: joi.string().trim().hostname().required(),
    MESSAGE_BROKER_USER: joi.string().trim().required(),
    MESSAGE_BROKER_PASSWORD: joi.string().trim().required(),
    HEALTHCHECK_PORT: joi.number().port().default(8080),
  }),
);

/** NODE_ENV - Defaults to `development` */
export const ENVIRONMENT =
  process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT;
export const CANDLE_INTERVAL = env.CANDLE_INTERVAL ?? '';
export const BINANCE_STREAM_URI = env.BINANCE_STREAM_URI ?? '';
export const MESSAGE_BROKER_URI =
  `${env.MESSAGE_BROKER_PROTOCOL}://${env.MESSAGE_BROKER_USER}:${env.MESSAGE_BROKER_PASSWORD}@${env.MESSAGE_BROKER_HOST}` ??
  '';
export const HEALTHCHECK_PORT = env.HEALTHCHECK_PORT;
