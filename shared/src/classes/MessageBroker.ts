import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';
import {
  MessageBrokerExchangeTypes,
  MESSAGE_BROKER_EXCHANGE_TYPES,
} from '../constants';
import {
  MessageBrokerAssertQueueOptions,
  MessageBrokerPublishOptions,
} from '../interfaces';

interface MessageBrokerConstructorOptions {
  uri: string;
  exchange: string;
  queue?: string;
  exchangeType?: MessageBrokerExchangeTypes;
  autoAck?: boolean;
}

export interface OnMessageHandler<T> {
  (data: T, msg: ConsumeMessage): Promise<void> | void;
}

// eslint-disable-next-line
export class MessageBroker<T = any> {
  private readonly uri: string;
  private readonly exchange: string;
  private readonly exchangeType: MessageBrokerExchangeTypes;
  private readonly queue: string | undefined;
  private connection: Connection | undefined;
  private channel: Channel | undefined;

  constructor(options: MessageBrokerConstructorOptions) {
    this.uri = options.uri;
    this.exchange = options.exchange;
    this.queue = options.queue;
    this.exchangeType =
      options.exchangeType ?? MESSAGE_BROKER_EXCHANGE_TYPES.TOPIC;
  }

  async initializeConnection() {
    if (!this.uri) {
      throw new Error('Message Broker URI is not defined');
    }

    if (!this.exchange) {
      throw new Error('Message Broker Exchange is not defined');
    }

    const connection = await connect(this.uri);

    const channel = await connection.createChannel();
    await channel.assertExchange(this.exchange, this.exchangeType, {
      durable: true,
    });

    this.connection = connection;
    this.channel = channel;

    return this;
  }

  async close() {
    await this.connection?.close();
  }

  private encodeMessage(data: T): Buffer {
    return Buffer.from(JSON.stringify(data));
  }

  private decodeMessage(msg: ConsumeMessage): T {
    return JSON.parse(msg.content.toString());
  }

  publish(topic: string, message: T, options?: MessageBrokerPublishOptions) {
    if (!this.connection) {
      throw new Error('Connection is not defined');
    }

    this.channel?.publish(
      this.exchange,
      topic,
      this.encodeMessage(message),
      options,
    );
  }

  async listen(
    topic: string,
    handler: OnMessageHandler<T>,
    queueOptions?: MessageBrokerAssertQueueOptions,
  ) {
    if (!this.connection) {
      throw new Error('Connection is not defined');
    }

    if (!handler) {
      throw new Error('onMessage handler is not defined');
    }

    const q = await this.channel?.assertQueue('q_' + this.queue, {
      durable: true,
      ...queueOptions,
    });

    if (!q?.queue) {
      throw new Error('There was an error asserting the queue');
    }

    await this.channel?.bindQueue(q?.queue, this.exchange, topic);

    this.channel?.consume(q?.queue, async (msg) => {
      if (msg !== null) {
        const content = this.decodeMessage(msg);

        try {
          if (handler instanceof Promise) {
            await handler(content, msg);
          } else {
            handler(content, msg);
          }
          this.channel?.ack(msg);
        } catch (error) {
          this.channel?.nack(msg, false, false);

          throw error;
        }
      }
    });
  }
}
