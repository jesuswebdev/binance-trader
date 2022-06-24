import { OHLC } from '../interfaces';

interface getVolumeTrendFunction {
  (data: OHLC): { volume_trend: 1 | -1 };
}

export const getVolumeTrend: getVolumeTrendFunction = function getVolumeTrend(
  ohlc,
) {
  const { open, close, volume } = ohlc;
  const lookback = 14;

  let up = 0;
  let down = 0;

  for (let i = volume.length - lookback; i < volume.length; i++) {
    close[i] > open[i] ? (up += volume[i]) : (down += volume[i]);
  }

  return { volume_trend: up - down > 0 ? 1 : -1 };
};
