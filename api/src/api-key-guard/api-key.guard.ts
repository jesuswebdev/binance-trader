import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKeyFromHeader(request);
    if (!apiKey) {
      throw new UnauthorizedException();
    }

    if (apiKey !== this.configService.get('API_KEY')) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractApiKeyFromHeader(request: Request): string | undefined {
    return request.headers['x-api-key'] as string;
  }
}
