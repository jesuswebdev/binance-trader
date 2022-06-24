import { LeanCandleDocument, nz } from '@binance-trader/shared';
import { OHLC } from '../interfaces';
import { getEMA, getTR, getRMA } from './index';

interface getCHATRFunction {
  (candles: LeanCandleDocument[], ohlc: OHLC): Promise<
    | {
        ch_atr: number;
        ch_atr_ema: number;
      }
    | undefined
  >;
}

export const getCHATR: getCHATRFunction = async function getCHATR(
  candles,
  ohlc,
) {
  if (candles.length === 1) {
    return;
  }

  const { high, low, close } = ohlc;

  const { tr } = (await getTR([high, low, close], {
    all: true,
    parseFn: nz,
  })) as Record<string, number[]>;

  const { rma } = await getRMA(tr, { periods: 10, parseFn: nz });
  const atrp = rma.map((t, i) => (t / close[i]) * 100);
  const { ema: avg } = (await getEMA([atrp], {
    periods: 28,
    parseFn: nz,
  })) as Record<string, number>;

  return {
    ch_atr_ema: avg,
    ch_atr: atrp[atrp.length - 1],
  };
};
