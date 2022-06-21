export const EXCHANGE_TYPES = {
  CANDLE_EVENTS: 'CANDLE_EVENTS',
  POSITION_EVENTS: 'POSITION_EVENTS',
  SIGNAL_EVENTS: 'SIGNAL_EVENTS',
} as const;

export type ExchangeTypes = typeof EXCHANGE_TYPES[keyof typeof EXCHANGE_TYPES];

export const CANDLE_EVENTS = {
  CANDLE_TICK: 'candle.tick',
  CANDLE_PROCESSED: 'candle.processed',
} as const;

export type CandleEvents = typeof CANDLE_EVENTS[keyof typeof CANDLE_EVENTS];

export const POSITION_EVENTS = {
  POSITION_CREATED: 'position.created',
  POSITION_CLOSED: 'position.closed',
  POSITION_CLOSED_REQUEUE: 'position.closed/requeue',
  POSITION_PROCESSED: 'position.processed',
} as const;

export type PositionEvents =
  typeof POSITION_EVENTS[keyof typeof POSITION_EVENTS];

export const SIGNAL_EVENTS = {
  SIGNAL_CREATED: 'signal.created',
  SIGNAL_CLOSED: 'signal.closed',
} as const;

export type SignalEvents = typeof SIGNAL_EVENTS[keyof typeof SIGNAL_EVENTS];

export const MILLISECONDS = {
  SECOND: 1e3,
  MINUTE: 1e3 * 60,
  HOUR: 36e5,
  DAY: 36e5 * 24,
  WEEK: 36e6 * 24 * 7,
} as const;

export const POSITION_STATUS = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
} as const;

export type PositionStatus =
  typeof POSITION_STATUS[keyof typeof POSITION_STATUS];

export const POSITION_SELL_TRIGGER = {
  STOP_LOSS: 'STOP_LOSS',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TRAILING_STOP_LOSS: 'TRAILING_STOP_LOSS',
} as const;

export type PositionSellTrigger =
  typeof POSITION_SELL_TRIGGER[keyof typeof POSITION_SELL_TRIGGER];

export const BINANCE_ORDER_TYPES = {
  LIMIT: 'LIMIT',
  MARKET: 'MARKET',
  STOP_LOSS: 'STOP_LOSS',
  STOP_LOSS_LIMIT: 'STOP_LOSS_LIMIT',
  TAKE_PROFIT: 'TAKE_PROFIT',
  TAKE_PROFIT_LIMIT: 'TAKE_PROFIT_LIMIT',
  LIMIT_MAKER: 'LIMIT_MAKER',
} as const;

export type BinanceOrderTypes =
  typeof BINANCE_ORDER_TYPES[keyof typeof BINANCE_ORDER_TYPES];

export const BINANCE_ORDER_STATUS = {
  NEW: 'NEW',
  PARTIALLY_FILLED: 'PARTIALLY_FILLED',
  FILLED: 'FILLED',
  CANCELED: 'CANCELED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export type BinanceOrderStatus =
  typeof BINANCE_ORDER_STATUS[keyof typeof BINANCE_ORDER_STATUS];

export const QUOTE_ASSETS = {
  BTC: 'BTC',
  BUSD: 'BUSD',
  USDT: 'USDT',
} as const;

export type QuoteAssets = typeof QUOTE_ASSETS[keyof typeof QUOTE_ASSETS];

export const SIGNAL_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export type SignalTypes = typeof SIGNAL_TYPES[keyof typeof SIGNAL_TYPES];
