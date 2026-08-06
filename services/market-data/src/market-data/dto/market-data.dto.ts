import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * A ticker, and nothing that is not a ticker.
 *
 * The pattern is not decoration: this value is interpolated into an outbound
 * URL by every provider, so an unbounded string would make the service a proxy
 * for fetching whatever a caller likes on our egress. Letters and digits, two
 * to twelve characters — an EGX code is four.
 */
export class SymbolParamDto {
  @ApiProperty({ example: 'COMI', description: 'رمز السهم في البورصة المصرية' })
  @IsString()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z0-9]{2,12}$/, {
    message: 'رمز السهم لازم يكون حروف وأرقام إنجليزية، من ٢ لـ١٢ خانة.',
  })
  symbol!: string;
}

export class SymbolsQueryDto {
  @ApiPropertyOptional({
    example: 'COMI,TMGH',
    description: 'رموز مفصولة بفاصلة. لو فاضية، بترجّع الرموز المتابَعة.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter((s) => /^[A-Z0-9]{2,12}$/.test(s))
          // Bounded so one request cannot fan out into a hundred upstream
          // calls and spend the rate limit for everybody.
          .slice(0, 50)
      : [],
  )
  symbols: string[] = [];
}

export class HistoryQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days = 30;
}

export class QuoteDto {
  @ApiProperty({ example: 'COMI' }) symbol!: string;
  @ApiProperty({ example: 78.4 }) price!: number;
  @ApiProperty({ nullable: true, example: 77.2 }) previousClose!: number | null;
  @ApiProperty({ nullable: true, example: 1.2 }) change!: number | null;
  @ApiProperty({
    nullable: true,
    example: 0.0155,
    description: 'كسر عشري مش نسبة مئوية — 0.0155 يعني ‎+1.55%‎',
  })
  changePercent!: number | null;
  @ApiProperty({ nullable: true }) volume!: number | null;
  @ApiProperty({ description: 'وقت السعر عند المصدر، مش وقت جلبه' })
  asOf!: string;
  @ApiProperty({ example: 'egxapi', description: 'المصدر، أو cache' })
  source!: string;
  @ApiProperty({ description: 'true لما السعر جه من الكاش لأن كل المصادر واقعة' })
  stale!: boolean;
}
