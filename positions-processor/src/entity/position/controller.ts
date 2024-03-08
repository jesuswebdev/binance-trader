import {
  CandleAttributes,
  CandleTickData,
  DATABASE_MODELS,
  getChange,
  MessageBroker,
  PositionDocument,
  PositionModel,
  POSITION_EVENTS,
  POSITION_STATUS,
  SignalAttributes,
  SignalModel,
  toSymbolPrecision,
} from '@binance-trader/shared';
import { Connection, Types } from 'mongoose';
import {
  POSITION_ARM_TRAILING_STOP_LOSS,
  POSITION_TAKE_PROFIT,
} from '../../config';
import { applyStrategy } from '../../strategy';

type ServicesProps = {
  database: Connection;
  broker: MessageBroker;
};

type ProcessOpenPositionsProps = ServicesProps & {
  candle: CandleTickData;
};

type CreatePositionProps = ServicesProps & {
  signal: SignalAttributes;
};

export const processOpenPositions = async function processOpenPositions({
  database,
  candle,
  broker,
}: ProcessOpenPositionsProps) {
  const positionModel: PositionModel = database.model(DATABASE_MODELS.POSITION);

  const results = await applyStrategy(database, candle);

  for (const result of results) {
    if (!result) {
      continue;
    }

    const { position, candle, sell_trigger } = result;

    if (position) {
      const sell_price = toSymbolPrecision(candle.close_price, candle.symbol);

      const closedPosition = await positionModel.findOneAndUpdate(
        { _id: position._id },
        {
          $set: {
            sell_price,
            close_date: new Date(),
            close_time: Date.now(),
            status: POSITION_STATUS.CLOSED,
            change: getChange(candle.close_price, position.buy_price),
            sell_trigger,
            sell_candle: candle,
          },
        },
        { new: true },
      );

      if (closedPosition) {
        broker.publish(POSITION_EVENTS.POSITION_CLOSED, closedPosition, {
          expiration: undefined,
        });
      }
    }
  }
};

export const createPosition = async function createPosition({
  database,
  broker,
  signal: signalFromMsg,
}: CreatePositionProps) {
  const positionModel: PositionModel = database.model(DATABASE_MODELS.POSITION);
  const signalModel: SignalModel = database.model(DATABASE_MODELS.SIGNAL);

  const signal = await signalModel
    .findOne({ id: signalFromMsg.id })
    .hint('_id_');

  if (!signal) {
    return;
  }

  const candle = signal.close_candle as CandleAttributes;

  const price = signal.price;
  const stop_loss =
    +candle.atr_stop < price ? +candle.atr_stop : price - +candle.atr * 3;

  const createdPosition: PositionDocument = await positionModel.create({
    id: `${candle.symbol}_${candle.interval}_${candle.event_time}`,
    symbol: signal.symbol,
    open_time: Date.now(),
    date: new Date(),
    buy_price: price,
    take_profit: toSymbolPrecision(
      price * (1 + POSITION_TAKE_PROFIT / 100),
      signal.symbol,
    ),
    stop_loss: toSymbolPrecision(stop_loss, signal.symbol),
    arm_trailing_stop_loss: toSymbolPrecision(
      price * (1 + POSITION_ARM_TRAILING_STOP_LOSS / 100),
      signal.symbol,
    ),
    trigger: signal.trigger,
    signal: signal._id,
    last_stop_loss_update: Date.now(),
    broadcast: signal.broadcast,
  });

  await signalModel
    .updateOne(
      { _id: new Types.ObjectId(signal._id) },
      { $set: { position: createdPosition._id } },
    )
    .hint('_id_');

  broker.publish(POSITION_EVENTS.POSITION_CREATED, createdPosition);

  return;
};
