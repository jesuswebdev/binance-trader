import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';
import events from 'events';
import {
  MessageBrokerExchangeTypes,
  MESSAGE_BROKER_EXCHANGE_TYPES,
} from '../constants';
import {
  MessageBrokerAssertQueueOptions,
  MessageBrokerPublishOptions,
} from '../interfaces';

type BrokerConnectionOptions = {
  protocol: string;
  hostname: string;
  username: string;
  password: string;
};

type MessageBrokerConstructorOptions = {
  connectionOptions: BrokerConnectionOptions;
  exchange: string;
  queue?: string;
  exchangeType?: MessageBrokerExchangeTypes;
  autoAck?: boolean;
};

export interface OnMessageHandler<T> {
  (data: T, msg: ConsumeMessage): Promise<void> | void;
}

// eslint-disable-next-line
export class MessageBroker<T = any> extends events.EventEmitter {
  private readonly connectionOptions: BrokerConnectionOptions;
  private readonly exchange: string;
  private readonly exchangeType: MessageBrokerExchangeTypes;
  private readonly queue: string | undefined;
  private connection: Connection | undefined;
  private channel: Channel | undefined;

  constructor(options: MessageBrokerConstructorOptions) {
    super();
    this.connectionOptions = options.connectionOptions;
    this.exchange = options.exchange;
    this.queue = options.queue;
    this.exchangeType =
      options.exchangeType ?? MESSAGE_BROKER_EXCHANGE_TYPES.TOPIC;
  }

  getChannel() {
    return this.channel;
  }

  async initializeConnection() {
    if (!this.connectionOptions) {
      throw new Error('Message Broker Connection Options is not defined');
    }

    if (!this.exchange) {
      throw new Error('Message Broker Exchange is not defined');
    }

    const connection = await connect({
      heartbeat: 15,
      vhost: '/',
      protocol: this.connectionOptions.protocol,
      hostname: this.connectionOptions.hostname,
      username: this.connectionOptions.username,
      password: this.connectionOptions.password,
    });

    connection.on('close', (error) => {
      this.emit('error', error);
    });

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

    const listenQueue = await this.channel?.assertQueue(
      'q_' + this.queue + '_' + topic.replace('.', '_'),
      {
        durable: true,
        ...queueOptions,
      },
    );

    if (!listenQueue?.queue) {
      throw new Error('There was an error asserting the queue');
    }

    await this.channel?.bindQueue(listenQueue?.queue, this.exchange, topic);

    this.channel?.consume(listenQueue?.queue, async (msg) => {
      if (msg !== null) {
        try {
          if (handler instanceof Promise) {
            await handler(this.decodeMessage(msg), msg);
          } else {
            handler(this.decodeMessage(msg), msg);
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
