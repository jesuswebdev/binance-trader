export interface KlineUpdateEvent {
  /**
   * Event type
   */
  e: string;
  /**
   * Event time
   */
  E: number;
  /**
   * Symbol
   */
  s: string;
  /**
   * K-Line data
   */
  k: KlineData;
}

interface KlineData {
  /**
   *  Kline start time
   */
  t: number;
  /**
   * Kline close time
   */
  T: number;
  /**
   * Symbol
   */
  s: string;
  /**
   * Interval
   */
  i: string;
  /**
   * First trade ID
   */
  f: number;
  /**
   * Last trade ID
   */
  L: number;
  /**
   * Open price
   */
  o: string;
  /**
   * Close price
   */
  c: string;
  /**
   * High price
   */
  h: string;
  /**
   * Low price
   */
  l: string;
  /**
   * Base asset volume
   */
  v: string;
  /**
   * Number of trades
   */
  n: number;
  /**
   * Is this kline closed?
   */
  x: boolean;
  /**
   * Quote asset volume
   */
  q: string;
  /**
   * Taker buy base asset volume
   */
  V: string;
  /**
   * Taker buy quote asset volume
   */
  Q: string;
  /**
   * Ignore
   */
  B: string;
}
