import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.setGlobalPrefix('/api');
  await app.listen(3000);
}
bootstrap();
