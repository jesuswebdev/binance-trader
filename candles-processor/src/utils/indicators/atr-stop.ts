import { LeanCandleDocument, nz } from '@binance-trader/shared';
import { OHLC } from '../interfaces';
import { getATR } from '.';

interface getATRStopFunction {
  (
    candles: LeanCandleDocument[],
    ohlc: OHLC,
    options: { parseFn: (v: number) => number | null },
  ): Promise<{ atr_stop: number } | undefined>;
}

export const getATRStop: getATRStopFunction = async function getATRStop(
  candles,
  ohlc,
  { parseFn },
) {
  if (candles.length === 1) {
    return;
  }

  const { high, low, close } = ohlc;

  const factor = 3.5;
  const pd = 5;

  const { atr } = await getATR([high, low, close], { periods: pd, parseFn });
  const loss = (atr as number) * factor;

  const [previous_candle] = candles.slice(-2);
  const [previous_close, current_close] = close.slice(-2);

  let atr_stop = 0;

  if (
    current_close > (parseFn(nz(previous_candle.atr_stop)) as number) &&
    previous_close > (parseFn(nz(previous_candle.atr_stop)) as number)
  ) {
    atr_stop = parseFn(
      Math.max(nz(previous_candle.atr_stop), current_close - loss),
    ) as number;
  } else if (
    current_close < (parseFn(nz(previous_candle.atr_stop)) as number) &&
    previous_close < (parseFn(nz(previous_candle.atr_stop)) as number)
  ) {
    atr_stop = parseFn(
      Math.min(nz(previous_candle.atr_stop), current_close + loss),
    ) as number;
  } else if (
    current_close > (parseFn(nz(previous_candle.atr_stop)) as number)
  ) {
    atr_stop = parseFn(current_close - loss) as number;
  } else {
    atr_stop = parseFn(current_close + loss) as number;
  }

  return { atr_stop };
};
