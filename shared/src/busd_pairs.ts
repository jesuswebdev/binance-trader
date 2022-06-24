export type Pair = { symbol: string; priceTickSize: number; stepSize: number };

export const PAIRS: Pair[] = [
  { symbol: 'BNBBUSD', priceTickSize: 0.01, stepSize: 0.01 },
  { symbol: 'BTCBUSD', priceTickSize: 0.01, stepSize: 0.000001 },
  { symbol: 'ETHBUSD', priceTickSize: 0.01, stepSize: 0.00001 },
  { symbol: 'LTCBUSD', priceTickSize: 0.01, stepSize: 0.00001 },
  { symbol: 'TRXBUSD', priceTickSize: 0.00001, stepSize: 0.1 },
  { symbol: 'XRPBUSD', priceTickSize: 0.0001, stepSize: 0.1 },
];
