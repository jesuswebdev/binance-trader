import { OrderAttributes } from '@binance-trader/shared';

export const parseOrder = function parseOrder(
  order: Record<string, string>,
): Partial<OrderAttributes> {
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
};
