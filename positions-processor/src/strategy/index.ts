import {
  CandleModel,
  CandleTickData,
  DATABASE_MODELS,
  getTimeDiff,
  LeanCandleDocument,
  LeanPositionDocument,
  PositionModel,
  POSITION_SELL_TRIGGER,
  POSITION_STATUS,
  toSymbolPrecision,
} from '@binance-trader/shared';
import { Connection, Types } from 'mongoose';
import { WAIT_SECONDS_BEFORE_SELLING } from '../config';

export const applyStrategy = async function applyStrategy(
  database: Connection,
  { symbol, interval }: CandleTickData,
) {
  const candleModel: CandleModel = database.model(DATABASE_MODELS.CANDLE);
  const positionModel: PositionModel = database.model(DATABASE_MODELS.POSITION);

  const count = await candleModel
    .countDocuments({
      $and: [
        { symbol },
        { open_time: { $gte: Date.now() - getTimeDiff(155, interval) } },
        { open_time: { $lte: Date.now() } },
      ],
    })
    .hint('symbol_1_open_time_1');

  if (count < 150) {
    return [];
  }

  const candles: LeanCandleDocument[] = await candleModel
    .find({
      $and: [
        { symbol },
        { open_time: { $gte: Date.now() - getTimeDiff(10, interval) } },
        { open_time: { $lte: Date.now() } },
      ],
    })
    .hint('symbol_1_open_time_1')
    .sort({ open_time: 1 })
    .lean();

  /*
    Binance does not push candles during maintenance hours.
    Therefore when system comes back up, there is a gap between
    the last candle when maintenance started and when it finished
  */

  const [candle] = candles.slice(-1);

  const positions: LeanPositionDocument[] = await positionModel
    .find({
      $and: [{ symbol }, { status: POSITION_STATUS.OPEN }],
    })
    .select({
      stop_loss: true,
      stop_loss_trigger_time: true,
      take_profit: true,
      buy_price: true,
    })
    .hint('symbol_1_status_1')
    .lean();

  if (positions.length === 0) {
    return [];
  }

  const result = await Promise.all(
    positions.map(async (position) => {
      /**
       *  =========== UPDATE STOP LOSS ===========
       */

      if (
        candle.atr_stop > position.stop_loss &&
        candle.atr_stop < candle.open_price
      ) {
        const newStopLoss = toSymbolPrecision(candle.atr_stop, candle.symbol);

        await positionModel
          .updateOne(
            { _id: new Types.ObjectId(position._id) },
            { $set: { stop_loss: newStopLoss } },
          )
          .hint('_id_');

        position.stop_loss = newStopLoss;
      }

      /**
       *  =========== END UPDATE STOP LOSS ===========
       */

      /**
       *  =========== TAKE PROFIT ===========
       */

      // execute action

      if (+candle.close_price >= position.take_profit) {
        return {
          position,
          candle,
          sell_trigger: POSITION_SELL_TRIGGER.TAKE_PROFIT,
        };
      }

      /**
       *  =========== END TAKE PROFIT ===========
       */

      /**
       *  =========== STOP LOSS ===========
       */

      // set timer
      if (
        +candle.close_price <= position.stop_loss &&
        !position.stop_loss_trigger_time
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $set: { stop_loss_trigger_time: Date.now() },
        });

        return;
      }

      const stop_loss_time_passed =
        position.stop_loss_trigger_time &&
        Date.now() - position.stop_loss_trigger_time >
          WAIT_SECONDS_BEFORE_SELLING;

      // remove timer
      if (
        position.stop_loss_trigger_time &&
        stop_loss_time_passed &&
        +candle.close_price > position.stop_loss
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $unset: { stop_loss_trigger_time: true },
        });

        return;
      }

      // execute action

      if (
        position.stop_loss_trigger_time &&
        stop_loss_time_passed &&
        +candle.close_price <= position.stop_loss
      ) {
        return {
          position,
          candle,
          sell_trigger: POSITION_SELL_TRIGGER.STOP_LOSS,
        };
      }

      /**
       *  =========== END STOP LOSS ===========
       */

      return Promise.resolve();

      // =======================================
    }),
  );

  return result.filter((exists) => exists);
};
