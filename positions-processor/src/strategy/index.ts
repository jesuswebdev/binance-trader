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
  MILLISECONDS,
} from '@binance-trader/shared';
import { Connection } from 'mongoose';
import { getTSL } from '../utils/getTrailingStopLoss';

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
       *  =========== TAKE PROFIT ===========
       */

      // set timer
      if (
        +candle.close_price >= position.take_profit &&
        !position.take_profit_trigger_time
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $set: { take_profit_trigger_time: Date.now() },
        });

        return;
      }

      const take_profit_time_passed =
        position.take_profit_trigger_time &&
        Date.now() - position.take_profit_trigger_time > MILLISECONDS.MINUTE;

      // remove timer
      if (
        position.take_profit_trigger_time &&
        take_profit_time_passed &&
        +candle.close_price < position.take_profit
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $unset: { take_profit_trigger_time: true },
        });

        return;
      }

      // execute action

      if (
        position.take_profit_trigger_time &&
        take_profit_time_passed &&
        +candle.close_price >= position.take_profit
      ) {
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
        Date.now() - position.stop_loss_trigger_time > MILLISECONDS.MINUTE;

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

      /**
       *  =========== TRAILING STOP LOSS ===========
       */

      const tsl = getTSL(+candle.close_price, candle.symbol);

      if (
        +candle.close_price >= position.arm_trailing_stop_loss &&
        !position.trailing_stop_loss_armed
      ) {
        // set trailing stop loss
        await positionModel.findByIdAndUpdate(position._id, {
          $set: {
            trailing_stop_loss_armed: true,
            trailing_stop_loss: tsl,
          },
        });

        return;
      }

      // set timer
      if (
        position.trailing_stop_loss_armed &&
        +candle.close_price <= position.trailing_stop_loss &&
        !position.trailing_stop_loss_trigger_time
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $set: { trailing_stop_loss_trigger_time: Date.now() },
        });

        return;
      }

      const trailing_stop_loss_time_passed =
        position.trailing_stop_loss_trigger_time &&
        Date.now() - position.trailing_stop_loss_trigger_time >
          MILLISECONDS.MINUTE;

      // remove timer
      if (
        position.trailing_stop_loss_armed &&
        position.trailing_stop_loss_trigger_time &&
        trailing_stop_loss_time_passed &&
        +candle.close_price > position.trailing_stop_loss
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $unset: { trailing_stop_loss_trigger_time: true },
        });

        return;
      }

      // execute action

      if (
        position.trailing_stop_loss_armed &&
        position.trailing_stop_loss_trigger_time &&
        trailing_stop_loss_time_passed &&
        +candle.close_price <= position.trailing_stop_loss
      ) {
        return {
          position,
          candle,
          sell_trigger: POSITION_SELL_TRIGGER.TRAILING_STOP_LOSS,
        };
      }

      // set tsl

      // do not update tsl while its looking to sell
      if (
        position.trailing_stop_loss_armed &&
        !position.trailing_stop_loss_trigger_time &&
        tsl > position.trailing_stop_loss
      ) {
        await positionModel.findByIdAndUpdate(position._id, {
          $set: { trailing_stop_loss: tsl },
        });
      }

      /**
       *  =========== END TRAILING STOP LOSS ===========
       */

      return Promise.resolve();

      // =======================================
    }),
  );

  return result.filter((exists) => exists);
};
