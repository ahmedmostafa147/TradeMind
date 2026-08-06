import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins', ['*']),
    methods: ['GET'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      // Rejects unknown fields rather than dropping them, so a caller sending
      // a misspelled parameter is told, instead of silently getting defaults.
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Radar Market Data')
    .setDescription(
      'خدمة أسعار البورصة المصرية بمصادر متعددة وتحويل تلقائي عند سقوط المصدر. ' +
        'كل سعر بيرجع معاه مصدره ووقته وهل هو من الكاش ولا لأ.',
    )
    .setVersion('0.1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'service-key')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  // Shuts the providers and Redis down cleanly on SIGTERM — without this the
  // container is killed mid-request on every deploy.
  app.enableShutdownHooks();

  await app.listen(config.get<number>('port', 3010), '0.0.0.0');
}

void bootstrap();
