import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import {
  HistoryQueryDto,
  QuoteDto,
  SymbolParamDto,
  SymbolsQueryDto,
} from '../dto/market-data.dto';
import { Quote } from '../entities/quote.entity';
import { MarketDataService } from '../services/market-data.service';
import { ProviderManager } from '../services/provider-manager.service';

/** Dates cross the wire as ISO strings; everything else passes through. */
const toDto = (quote: Quote): QuoteDto => ({
  ...quote,
  asOf: quote.asOf.toISOString(),
});

@ApiTags('market')
@Controller('market')
export class MarketDataController {
  constructor(
    private readonly marketData: MarketDataService,
    private readonly providers: ProviderManager,
    private readonly config: ConfigService,
  ) {}

  @Get('prices')
  @ApiOperation({
    summary: 'أسعار عدة أسهم',
    description:
      'بترجّع الرموز المطلوبة، أو الرموز المتابَعة لو مبعتش حاجة. ' +
      'الرمز اللي مفيش له سعر بيغيب من النتيجة بدل ما يرجع بصفر — ' +
      'مفيش سعر ومفيش حركة حاجتين مختلفين.',
  })
  @ApiOkResponse({ type: [QuoteDto] })
  async prices(@Query() query: SymbolsQueryDto): Promise<QuoteDto[]> {
    const symbols =
      query.symbols.length > 0
        ? query.symbols
        : this.config.get<string[]>('trackedSymbols', []);
    const quotes = await this.marketData.getPrices(symbols);
    return quotes.map(toDto);
  }

  @Get('price/:symbol')
  @ApiOperation({ summary: 'سعر سهم واحد' })
  @ApiParam({ name: 'symbol', example: 'COMI' })
  @ApiOkResponse({ type: QuoteDto })
  @ApiServiceUnavailableResponse({
    description: 'كل المصادر واقعة ومفيش نسخة محفوظة.',
  })
  async price(@Param() params: SymbolParamDto): Promise<QuoteDto> {
    return toDto(await this.marketData.getPrice(params.symbol));
  }

  @Get('history/:symbol')
  @ApiOperation({
    summary: 'شموع يومية',
    description: 'الأقدم أولًا. مفيش كاش هنا — سلسلة ناقصة أسوأ من رفض صريح.',
  })
  @ApiParam({ name: 'symbol', example: 'COMI' })
  async history(
    @Param() params: SymbolParamDto,
    @Query() query: HistoryQueryDto,
  ) {
    const candles = await this.marketData.getHistory(params.symbol, query.days);
    return candles.map((candle) => ({
      ...candle,
      date: candle.date.toISOString(),
    }));
  }

  @Get('status')
  @ApiOperation({
    summary: 'حالة الخدمة',
    description:
      'healthy = شغّالة على المصدر الأساسي · degraded = شغّالة على البديل · ' +
      'down = كل المصادر واقعة والخدمة بتقدّم الكاش.',
  })
  status() {
    return this.marketData.status();
  }

  @Get('providers')
  @ApiOperation({ summary: 'المصادر وحالة كل واحد' })
  providersList() {
    return this.providers.status();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'عدّادات التشغيل' })
  metrics() {
    return this.marketData.status().metrics;
  }
}
