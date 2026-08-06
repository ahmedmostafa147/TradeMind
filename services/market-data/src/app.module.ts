import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { ApiKeyGuard } from './common/api-key.guard';
import { configuration, configValidationSchema } from './config/configuration';
import { MarketDataModule } from './market-data/market-data.module';

function prettyAvailable(): boolean {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('logLevel', 'info'),
          // Pretty only in development, and only if the formatter is actually
          // installed: it is a devDependency, so a production image running
          // with NODE_ENV=development would otherwise fail to BOOT over a log
          // format. Resolved rather than assumed for exactly that reason.
          transport:
            config.get<string>('nodeEnv') === 'development' && prettyAvailable()
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          redact: ['req.headers.authorization', 'req.headers["x-api-key"]'],
        },
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('rateLimit.ttlMs', 60_000),
          limit: config.get<number>('rateLimit.max', 120),
        },
      ],
    }),
    MarketDataModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
