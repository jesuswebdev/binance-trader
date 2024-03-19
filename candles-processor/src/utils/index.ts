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
  getATRStop,
  getCHATR,
  getEMASlope,
  getMACD,
  getMESA,
  getSupertrend,
  getVolumeTrend,
  getHeikenAshi,
  calculateAverageTrueRange,
  calculateOnBalanceVolume,
  calculateAverageDirectionalIndex,
} from './indicators';
import { OHLC } from './interfaces';

type BuildCandlesProps = {
  candles: [number[]];
  symbol: string;
  interval: string;
};

export function buildCandles({ candles, symbol, interval }: BuildCandlesProps) {
  return candles.map(function (current) {
    return {
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
    };
  });
}

export function getRedisKeys(candle: CandleTickData) {
  return {
    lastProcessDate: `${candle.symbol}_last_candles_process_date`,
    candlesPersistLock: `${candle.symbol}_candles_persist_lock`,
    hasOpenSignal: `${candle.symbol}_has_open_signal`,
    candles: `${candle.symbol}_candles`,
    cachedCandles: `${candle.symbol}_${candle.open_time}_cached_candles`,
  };
}

function assertOHLCValue(value: number) {
  if (!numberIsValid(value)) {
    throw new Error('Invalid OHLC value: ' + value);
  }

  return value;
}

export function getOHLCValues(array: CandleAttributes[]) {
  const ohlc: OHLC = {
    open: [],
    high: [],
    low: [],
    close: [],
    volume: [],
    hl2: [],
  };

  for (const candle of array) {
    ohlc.open.push(assertOHLCValue(candle.open_price));
    ohlc.high.push(assertOHLCValue(candle.high_price));
    ohlc.low.push(assertOHLCValue(candle.low_price));
    ohlc.close.push(assertOHLCValue(candle.close_price));
    ohlc.volume.push(assertOHLCValue(candle.base_asset_volume));
    ohlc.hl2.push(assertOHLCValue((candle.high_price + candle.low_price) / 2));
  }

  return ohlc;
}

function parseValue(symbol: string, value: number) {
  if (!numberIsValid(value)) {
    return null;
  }

  return toSymbolPrecision(value, symbol);
}

function getSupertrendValueGetter({
  trend,
  trend_up,
  trend_down,
}: LeanCandleDocument | Record<string, number>) {
  return { trend, trend_up, trend_down };
}

function getATRStopValueGetter({
  atr_stop,
}: LeanCandleDocument | Record<string, number>) {
  return { atr_stop };
}

export function getIndicatorsValues(ohlc: OHLC, candles: LeanCandleDocument[]) {
  const [previous_candle, current_candle] = cloneObject(candles.slice(-2));

  const parseFn = parseValue.bind(null, current_candle.symbol);

  const mesa_result = getMESA(ohlc.hl2);

  return {
    mama: parseFn(mesa_result.mama),
    fama: parseFn(mesa_result.fama),
    ...getVolumeTrend(ohlc),
    ...getHeikenAshi(candles),
    ...calculateAverageTrueRange([ohlc.high, ohlc.low, ohlc.close], {
      parseFn,
    }),
    ...calculateOnBalanceVolume([ohlc.close, ohlc.volume], { parseFn }),
    ...calculateAverageDirectionalIndex([ohlc.high, ohlc.low, ohlc.close], {
      parseFn,
    }),
    ...getMACD(),
    ...getEMASlope(ohlc, { parseFn }),
    ...getCHATR(candles, ohlc),
    /* eslint-disable */
    ...(!previous_candle.trend && !current_candle.trend
      ? getCumulativeIndicator({
          candles,
          ohlc,
          getter: getSupertrendValueGetter,
          fn: getSupertrend,
          parseFn,
        })
      : getSupertrend(candles, ohlc, { parseFn })),
    ...(!previous_candle.atr_stop && !current_candle.atr_stop
      ? getCumulativeIndicator({
          candles,
          ohlc,
          getter: getATRStopValueGetter,
          fn: getATRStop,
          parseFn,
        })
      : getATRStop(candles, ohlc, { parseFn })),
    /* eslint-enable */
  };
}

function getCumulativeIndicator({
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
}) {
  let index = 0;

  const processedCandles = [];

  for (const candle of candles) {
    const sliced_candles = candles.slice(0, index + 1).map((sliced) => ({
      ...sliced,
      ...getter(
        processedCandles.find(
          (processedCandle) => processedCandle.id === sliced.id,
        ) || {},
      ),
    }));

    const sliced_ohlc = {};

    for (const key in ohlc) {
      sliced_ohlc[key] = ohlc[key].slice(0, index + 1);
    }

    const value = fn(sliced_candles, sliced_ohlc, { parseFn });

    processedCandles.push({ ...candle, ...value });
    index += 1;
  }

  return processedCandles[processedCandles.length - 1];
}
