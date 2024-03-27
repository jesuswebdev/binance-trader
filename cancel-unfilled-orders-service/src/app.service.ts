import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SERVICES } from './utils/constants';
import {
  MessageBroker,
  OrderAttributes,
  POSITION_EVENTS,
  BinanceApiInstance,
  BINANCE_ORDER_STATUS,
  MILLISECONDS,
  BINANCE_ORDER_TYPES,
  SIGNAL_TYPES,
} from '@binance-trader/shared';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Position } from './position/position.schema';
import { LeanOrderDocument, Order } from './order/order.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(SERVICES.MESSAGE_BROKER) private brokerService: MessageBroker,
    @Inject(SERVICES.BINANCE_API) private binanceApi: BinanceApiInstance,
    @InjectModel(Position.name) private positionModel: Model<Position>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @Inject(ConfigService) private configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    const orders: LeanOrderDocument[] = await this.orderModel
      .find({
        $and: [
          {
            status: {
              $nin: [
                BINANCE_ORDER_STATUS.FILLED,
                BINANCE_ORDER_STATUS.CANCELED,
              ],
            },
          },
          { time: { $gt: Date.now() - MILLISECONDS.HOUR } },
        ],
      })
      .select({
        side: true,
        type: true,
        eventTime: true,
        clientOrderId: true,
        symbol: true,
        orderId: true,
        lastCancelAttempt: true,
      })
      .hint('status_1_time_1')
      .lean();

    if (orders.length === 0) {
      return;
    }

    const filteredOrders = orders.filter((order) => {
      const canAttemptToCancelOrder =
        (order.lastCancelAttempt ?? 0) +
          +this.configService.get('MINUTES_BETWEEN_CANCEL_ATTEMPTS') <
        Date.now();
      const shouldCancelBuyOrder =
        order.side === 'BUY' &&
        order.type === BINANCE_ORDER_TYPES.LIMIT &&
        Date.now() > order.eventTime + +this.configService.get('BUY_ORDER_TTL');
      const shouldCancelSellOrder =
        order.side === 'SELL' &&
        order.type === BINANCE_ORDER_TYPES.LIMIT &&
        Date.now() >
          order.eventTime + +this.configService.get('SELL_ORDER_TTL');

      return (
        (shouldCancelBuyOrder || shouldCancelSellOrder) &&
        canAttemptToCancelOrder
      );
    });

    if (filteredOrders.length === 0) {
      return;
    }

    for (const order of filteredOrders) {
      // order placed via Web UI
      if (
        (order.clientOrderId ?? '').match(/web_/) ||
        (order.clientOrderId ?? '').match(/and_/)
      ) {
        continue;
      }

      const tradeQuery = new URLSearchParams({
        symbol: order.symbol,
        orderId: order.orderId.toString(),
      }).toString();

      await this.orderModel
        .updateOne(
          { $and: [{ orderId: order.orderId }, { symbol: order.symbol }] },
          { $set: { lastCancelAttempt: Date.now() } },
        )
        .hint('orderId_-1_symbol_-1');

      try {
        await this.binanceApi.delete(`/api/v3/order?${tradeQuery}`);
      } catch (error: unknown) {
        this.logger.error(error);
        // update order in database, next time this function runs it will have the updated order
        await this.fetchOrderFromBinance(order);
        continue;
      }

      if (order.side === SIGNAL_TYPES.SELL) {
        const position = await this.positionModel
          .findOne({ 'sell_order.orderId': order.orderId })
          .hint('sell_order.orderId_1')
          .lean();

        if (position) {
          this.brokerService.publish(
            POSITION_EVENTS.POSITION_CLOSED_REQUEUE,
            position,
          );
        }
      }
    }
  }

  async fetchOrderFromBinance(
    order: OrderAttributes,
  ): Promise<LeanOrderDocument> {
    if (!order) {
      throw new Error('Order is not defined.');
    }

    const query = new URLSearchParams({
      orderId: order.orderId.toString(),
      symbol: order.symbol,
    }).toString();

    const { data } = await this.binanceApi.get(`/api/v3/order?${query}`);

    if (!data) {
      return;
    }

    const updatedOrder: LeanOrderDocument = await this.orderModel
      .findOneAndUpdate(
        { $and: [{ symbol: order.symbol }, { orderId: data.orderId }] },
        { $set: this.parseOrder(data) },
        { upsert: true, new: true },
      )
      .lean();

    return updatedOrder;
  }

  parseOrder(order: Record<string, string>): Partial<OrderAttributes> {
    return {
      symbol: order.symbol,
      orderId: +order.orderId,
      orderListId: +order.orderListId,
      clientOrderId: order.clientOrderId,
      price: order.price,
      origQty: order.origQty,
      executedQty: order.executedQty,
      cummulativeQuoteQty: order.cummulativeQuoteQty,
      commissionAmount: order.commissionAmount,
      commissionAsset: order.commissionAsset,
      status: order.status,
      timeInForce: order.timeInForce,
      type: order.type,
      side: order.side,
      stopPrice: order.stopPrice,
      time: +order.time,
    };
  }
}
