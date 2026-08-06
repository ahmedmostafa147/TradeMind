import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MarketDataController } from './controllers/market-data.controller';
import { MarketDataGateway } from './gateway/market-data.gateway';
import { MARKET_DATA_PROVIDERS } from './interfaces/market-data-provider.interface';
import { EgxApiProvider } from './providers/egx-api.provider';
import { FallbackProvider } from './providers/fallback.provider';
import { PricePoller } from './scheduler/price-poller.service';
import { MarketDataService } from './services/market-data.service';
import { MetricsService } from './services/metrics.service';
import { PriceCacheService } from './services/price-cache.service';
import { ProviderManager } from './services/provider-manager.service';

/**
 * ADDING A PROVIDER IS ADDING TWO LINES HERE AND ONE FILE.
 *
 * The class implements MarketDataProvider, gets a `priority`, and joins the
 * array below. ProviderManager sorts by priority and everything above it —
 * the service, the controller, the gateway, the poller — is untouched. That is
 * the whole reason the interface exists, and the reason the scraper can be
 * written later without reopening this module.
 */
@Module({
  controllers: [MarketDataController],
  providers: [
    EgxApiProvider,
    FallbackProvider,
    {
      provide: MARKET_DATA_PROVIDERS,
      inject: [EgxApiProvider, FallbackProvider, ConfigService],
      useFactory: (
        egx: EgxApiProvider,
        fallback: FallbackProvider,
        config: ConfigService,
      ) => {
        const providers = [egx];
        // Switchable, because a fallback that is misbehaving worse than the
        // outage it covers has to be removable without a deploy.
        if (config.get<boolean>('fallback.enabled', true)) {
          providers.push(fallback as unknown as EgxApiProvider);
        }
        return providers;
      },
    },
    MetricsService,
    PriceCacheService,
    ProviderManager,
    MarketDataService,
    MarketDataGateway,
    PricePoller,
  ],
  exports: [MarketDataService, ProviderManager],
})
export class MarketDataModule {}
