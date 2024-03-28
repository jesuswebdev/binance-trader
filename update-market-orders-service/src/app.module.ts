import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import {
  ENVIRONMENT_TYPES,
  EXCHANGE_TYPES,
  MessageBroker,
  ORDER_EVENTS,
} from '@binance-trader/shared';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order/order.schema';
import { Position, PositionSchema } from './position/position.schema';
import { SERVICES } from './utils/constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: resolve(
        __dirname,
        `../.env.${process.env.NODE_ENV ?? ENVIRONMENT_TYPES.DEVELOPMENT}`,
      ),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: `${configService.get('DATABASE_PROTOCOL')}://${configService.get('DATABASE_USERNAME')}:${configService.get('DATABASE_PASSWORD')}@${configService.get('DATABASE_HOST')}/${configService.get('DATABASE_NAME')}`,
        authSource: 'admin',
      }),
    }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Position.name, schema: PositionSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      inject: [ConfigService, AppService],
      provide: SERVICES.MESSAGE_BROKER,
      useFactory: async (
        configService: ConfigService,
        appService: AppService,
      ) => {
        const broker = new MessageBroker({
          connectionOptions: {
            protocol: configService.get('MESSAGE_BROKER_PROTOCOL'),
            hostname: configService.get('MESSAGE_BROKER_HOST'),
            username: configService.get('MESSAGE_BROKER_USER'),
            password: configService.get('MESSAGE_BROKER_PASSWORD'),
          },
          exchange: EXCHANGE_TYPES.MAIN,
          queue: 'update-market-orders-service',
        });

        await broker.initializeConnection();

        broker.on('error', (error) => {
          console.error(error);
          process.exit(1);
        });

        // https://github.com/nestjs/nest/issues/5147#issuecomment-1329110784
        broker.listen(ORDER_EVENTS.MARKET_BUY_ORDER_CREATED, (msg) =>
          appService.updateMarketBuyOrder(msg),
        );

        return broker;
      },
    },
  ],
})
export class AppModule {}
