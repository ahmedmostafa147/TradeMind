import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

/**
 * Optional shared-secret gate.
 *
 * OFF WHEN SERVICE_API_KEY IS EMPTY, and that is a deliberate default rather
 * than an oversight: closing prices are public market data, and demanding a
 * credential to read them protects nothing while making the service harder to
 * put behind a CDN. Set the variable when this sits on a network where the
 * rate limit is not enough on its own.
 *
 * Compared in constant time — a string `===` on a secret leaks its prefix to
 * anyone willing to measure.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('serviceApiKey', '');
    if (expected === '') return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = request.headers['x-api-key'];
    const presented = Array.isArray(header) ? header[0] : header;
    if (typeof presented !== 'string') {
      throw new UnauthorizedException('مفتاح الخدمة مطلوب.');
    }

    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    // Length is compared first because timingSafeEqual throws on a mismatch;
    // the length itself is not the secret.
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('مفتاح الخدمة غير صالح.');
    }
    return true;
  }
}
