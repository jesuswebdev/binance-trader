import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ApiKeyGuard } from './api-key-guard/api-key.guard';

@Controller({ version: '1' })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/healthz')
  @HttpCode(HttpStatus.OK)
  healthcheck(): string {
    return 'ok';
  }

  @UseGuards(ApiKeyGuard)
  @Get('/stats')
  @HttpCode(HttpStatus.OK)
  getStats() {
    return this.appService.getStats();
  }
}
