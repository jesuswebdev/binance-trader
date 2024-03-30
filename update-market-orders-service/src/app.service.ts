import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Position } from './position/position.schema';
import { Order, OrderDocument } from './order/order.schema';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { OrderAttributes, toSymbolPrecision } from '@binance-trader/shared';
import { SERVICES } from './utils/constants';
import { AxiosInstance } from 'axios';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Position.name) private positionModel: Model<Position>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @Inject(ConfigService) private configService: ConfigService,
    @Inject(SERVICES.BINANCE_API) private binanceApi: AxiosInstance,
  ) {}

  async updateMarketBuyOrder(payload: {
    position_id: string;
    order_id: number;
  }) {
    const { position_id, order_id } = payload;

    if (!position_id) {
      this.logger.error('Position ID is not defined');

      return;
    }

    if (!order_id) {
      this.logger.error('Order ID is not defined');

      return;
    }

    const position = await this.positionModel.findById(
      new Types.ObjectId(position_id),
    );

    if (!position) {
      this.logger.error(`Position with ID '${position_id}' does not exist`);

      return;
    }

    if (!position.buy_order) {
      this.logger.error(
        `Position with ID '${position_id}' does not have a buy order`,
      );

      return;
    }

    const order = await this.orderModel.findOne({
      $and: [{ symbol: position.symbol }, { orderId: order_id }],
    });

    if (!order) {
      this.logger.error(
        `Order with ID '${position.symbol}-${order_id}' does not exist`,
      );

      return;
    }

    if (position.sell_order) {
      this.logger.log(`Position with ID '${position_id}' is closed. Skipping.`);

      return;
    }

    // update values

    const marketPrice = toSymbolPrecision(
      +order.cummulativeQuoteQty / +order.executedQty,
      position.symbol,
    );

    if (isNaN(marketPrice)) {
      await this.fetchOrderFromBinance(order);
      return this.updateMarketBuyOrder(payload);
    }

    this.logger.log(
      `Updating position with ID '${position_id}' and order ID '${order_id}'. Market price: ${marketPrice}`,
    );

    await this.positionModel.updateOne(
      { _id: new Types.ObjectId(position_id) },
      {
        $set: {
          take_profit: toSymbolPrecision(
            marketPrice *
              (1 + +this.configService.get('POSITION_TAKE_PROFIT') / 100),
            position.symbol,
          ),
          stop_loss: toSymbolPrecision(
            marketPrice *
              (1 - +this.configService.get('POSITION_STOP_LOSS') / 100),
            position.symbol,
          ),
          arm_trailing_stop_loss: toSymbolPrecision(
            marketPrice *
              (1 +
                +this.configService.get('POSITION_ARM_TRAILING_STOP_LOSS') /
                  100),
            position.symbol,
          ),
          market_buy_price: marketPrice,
        },
      },
    );
  }

  async fetchOrderFromBinance(order: OrderAttributes): Promise<OrderDocument> {
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

    const updatedOrder: OrderDocument = await this.orderModel
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
