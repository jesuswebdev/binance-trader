import { OHLC } from '../interfaces';
import { getSMA } from './index';
import { nz } from '@binance-trader/shared';

interface getPumpOrDumpFunction {
  (data: OHLC, options: { parseFn: (v: number) => number | null }): Promise<{
    is_pump: boolean;
  }>;
}

export const getPumpOrDump: getPumpOrDumpFunction =
  async function getPumpOrDump(ohlc, { parseFn }) {
    //Pump Alerts by herrkaschel
    const lookback = 150;
    const threshold = 15; // % change to be considered a pump
    const { volume, close } = ohlc;

    const mav: number[] = [];
    const all_historic_max: number[] = [];
    const is_pump: boolean[] = [];

    for (let index = 0; index < volume.length; index++) {
      const prev_mav = mav[mav.length - 1];
      const prev_historic_max = all_historic_max[all_historic_max.length - 1];
      const src = volume.slice(0, index + 1);

      if (src.length < 2) {
        continue;
      }

      const previous_close = close[index - 1] || 0;
      const current_close = close[index] || 0;
      const { sma: mav_sma } = await getSMA([src], {
        periods: lookback,
        parseFn,
      });
      const difference = nz(mav_sma) - nz(prev_mav);
      const increasing = current_close > previous_close && difference > 0;
      const vroc =
        increasing && nz(prev_mav) !== 0 ? difference * (100 / prev_mav) : 0;
      const firstVrocNormalizedValue = 10;
      const historic_max =
        vroc > nz(prev_historic_max)
          ? vroc
          : nz(prev_historic_max, firstVrocNormalizedValue);
      const vrocNormalized =
        nz(historic_max) !== 0 ? (vroc / historic_max) * 100 : 0;

      is_pump.push(vrocNormalized >= threshold);
      all_historic_max.push(historic_max);
      mav.push(nz(mav_sma));
    }

    return { is_pump: is_pump[is_pump.length - 1] };
  };
