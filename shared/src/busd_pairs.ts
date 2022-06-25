export type Pair = {
  symbol: string;
  priceTickSize: number;
  stepSize: number;
  quoteAsset: string;
  baseAsset: string;
};

export const PAIRS: Pair[] = [
  {
    symbol: 'BNBBUSD',
    quoteAsset: 'BUSD',
    baseAsset: 'BNB',
    priceTickSize: 0.01,
    stepSize: 0.01,
  },
  {
    symbol: 'BTCBUSD',
    quoteAsset: 'BUSD',
    baseAsset: 'BTC',
    priceTickSize: 0.01,
    stepSize: 0.000001,
  },
  {
    symbol: 'ETHBUSD',
    quoteAsset: 'BUSD',
    baseAsset: 'ETH',
    priceTickSize: 0.01,
    stepSize: 0.00001,
  },
  {
    symbol: 'LTCBUSD',
    quoteAsset: 'BUSD',
    baseAsset: 'LTC',
    priceTickSize: 0.01,
    stepSize: 0.00001,
  },
  {
    symbol: 'TRXBUSD',
    quoteAsset: 'BUSD',
    baseAsset: 'TRX',
    priceTickSize: 0.00001,
    stepSize: 0.1,
  },
  {
    symbol: 'XRPBUSD',
    quoteAsset: 'BUSD',
    baseAsset: 'XRP',
    priceTickSize: 0.0001,
    stepSize: 0.1,
  },
];
