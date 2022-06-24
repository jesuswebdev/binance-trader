export * from './candle';
export * from './market';
export * from './position';

export interface MessageBrokerPublishOptions {
  expiration?: string | number | undefined;
  userId?: string | undefined;
  CC?: string | string[] | undefined;

  mandatory?: boolean | undefined;
  persistent?: boolean | undefined;
  deliveryMode?: boolean | number | undefined;
  BCC?: string | string[] | undefined;

  contentType?: string | undefined;
  contentEncoding?: string | undefined;
  // eslint-disable-next-line
  headers?: any;
  priority?: number | undefined;
  correlationId?: string | undefined;
  replyTo?: string | undefined;
  messageId?: string | undefined;
  timestamp?: number | undefined;
  type?: string | undefined;
  appId?: string | undefined;
}

export interface MessageBrokerAssertQueueOptions {
  exclusive?: boolean | undefined;
  durable?: boolean | undefined;
  autoDelete?: boolean | undefined;
  // eslint-disable-next-line
  arguments?: any;
  messageTtl?: number | undefined;
  expires?: number | undefined;
  deadLetterExchange?: string | undefined;
  deadLetterRoutingKey?: string | undefined;
  maxLength?: number | undefined;
  maxPriority?: number | undefined;
}
