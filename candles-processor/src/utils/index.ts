import {
  LeanCandleDocument,
  numberIsValid,
  toSymbolPrecision,
} from '@binance-trader/shared';
import {
  CandleAttributes,
  CandleTickData,
  cloneObject,
} from '@binance-trader/shared';
import {
  getATR,
  getATRStop,
  getCHATR,
  getDMI,
  getEMASlope,
  getMACD,
  getMESA,
  getOBV,
  getPumpOrDump,
  getSupertrend,
  getVolumeTrend,
} from './indicators';
import { OHLC } from './interfaces';

type BuildCandlesProps = {
  candles: [number[]];
  symbol: string;
  interval: string;
};

export const buildCandles = function buildCandles({
  candles,
  symbol,
  interval,
}: BuildCandlesProps) {
  return candles.map((current) => ({
    symbol,
    interval,
    id: `${symbol}_${interval}_${cloneObject(current[0])}`,
    event_time: +cloneObject(current[0]),
    open_time: +cloneObject(current[0]),
    close_time: +cloneObject(current[6]),
    open_price: +cloneObject(current[1]),
    close_price: +cloneObject(current[4]),
    high_price: +cloneObject(current[2]),
    low_price: +cloneObject(current[3]),
    base_asset_volume: +cloneObject(current[5]),
    quote_asset_volume: +cloneObject(current[7]),
    date: new Date(+cloneObject(current[0])).toISOString(),
  }));
};

export const getRedisKeys = function getRedisKeys(candle: CandleTickData) {
  return {
    lastProcessDate: `${candle.symbol}_last_candles_process_date`,
    candlesPersistLock: `${candle.symbol}_candles_persist_lock`,
    hasOpenSignal: `${candle.symbol}_has_open_signal`,
    candles: `${candle.symbol}_candles`,
    cachedCandles: `${candle.symbol}_${candle.open_time}_cached_candles`,
  };
};

export const getOHLCValues = function getOHLCValues(array: CandleAttributes[]) {
  const assertValue = (value: number) => {
    if (!numberIsValid(value)) {
      throw new Error('Invalid OHLC value: ' + value);
    }

    return value;
  };

  const ohlc: OHLC = {
    open: [],
    high: [],
    low: [],
    close: [],
    volume: [],
    hl2: [],
  };

  for (const candle of array) {
    ohlc.open.push(assertValue(candle.open_price));
    ohlc.high.push(assertValue(candle.high_price));
    ohlc.low.push(assertValue(candle.low_price));
    ohlc.close.push(assertValue(candle.close_price));
    ohlc.volume.push(assertValue(candle.base_asset_volume));
    ohlc.hl2.push(assertValue((candle.high_price + candle.low_price) / 2));
  }

  return ohlc;
};

const parseValue = function parseValue(symbol: string, value: number) {
  if (!numberIsValid(value)) {
    return null;
  }

  return toSymbolPrecision(value, symbol);
};

export const getIndicatorsValues = async function getIndicatorsValues(
  ohlc: OHLC,
  candles: LeanCandleDocument[],
) {
  const { high, close, low, volume, hl2 } = ohlc;
  const [previous_candle, current_candle] = cloneObject(candles.slice(-2));

  const parseFn = parseValue.bind(null, current_candle.symbol);

  const promises = [
    getATR([high, low, close], { parseFn }),
    getOBV([close, volume], { parseFn }),
    getDMI([high, low, close], { parseFn }),
    getMACD([close], { parseFn }),
    getEMASlope(ohlc, { parseFn }),
    // prettier-ignore
    ...(!previous_candle.trend && !current_candle.trend
      ? [
        getCumulativeIndicator({
          candles,
          ohlc,
          getter: ({ trend, trend_up, trend_down } = {}) => ({
            trend,
            trend_up,
            trend_down,
          }),
          fn: getSupertrend,
          parseFn,
        }),
      ]
      : [getSupertrend(candles, ohlc, { parseFn })]),
    // prettier-ignore
    ...(!previous_candle.atr_stop && !current_candle.atr_stop
      ? [
        getCumulativeIndicator({
          candles,
          ohlc,
          getter: ({ atr_stop } = {}) => ({ atr_stop }),
          fn: getATRStop,
          parseFn,
        }),
      ]
      : [getATRStop(candles, ohlc, { parseFn })]),
    getCHATR(candles, ohlc),
    getPumpOrDump(ohlc, { parseFn }),
  ];

  const p = await Promise.all(promises);
  const result = p.reduce((acc, v) => ({ ...acc, ...v }), {});
  const mesa_result = getMESA(hl2);

  return {
    ...result,
    mama: parseFn(mesa_result.mama),
    fama: parseFn(mesa_result.fama),
    ...getVolumeTrend(ohlc),
  };
};

const getCumulativeIndicator = async ({
  candles,
  ohlc,
  fn,
  getter,
  parseFn,
}: {
  candles: LeanCandleDocument[];
  ohlc: OHLC;
  fn: CallableFunction;
  getter: (
    obj: LeanCandleDocument | Record<string, number | undefined>,
  ) => Record<string, number | undefined>;
  parseFn: CallableFunction;
}) => {
  const result = await candles
    //eslint-disable-next-line
    .reduce(async (p_acc, candle, index, array) => {
      const acc = await p_acc;
      const sliced_candles = array.slice(0, index + 1).map((sliced) => ({
        ...sliced,
        ...getter(acc.find((v) => v.id === sliced.id) ?? {}),
      }));
      const sliced_ohlc = Object.entries(ohlc).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value.slice(0, index + 1) }),
        {},
      );

      const value = await fn(sliced_candles, sliced_ohlc, { parseFn });

      return acc.concat({ ...candle, ...value });
    }, Promise.resolve<LeanCandleDocument[]>([]))
    .then((r) => getter(r[r.length - 1]));

  return result;
};
