import { toSymbolPrecision } from '@binance-trader/shared';
import { POSITION_TRAILING_STOP_LOSS } from '../config';

export function getTSL(price: number, symbol: string) {
  return toSymbolPrecision(
    +price * (1 - POSITION_TRAILING_STOP_LOSS / 100),
    symbol,
  );
}
