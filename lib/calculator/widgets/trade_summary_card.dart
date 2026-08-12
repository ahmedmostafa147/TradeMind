import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/calc/smart_trade.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';
import '../../core/widgets/risk_warning.dart';

/// «ملخص الصفقة» — ONLY what was worked out, never what was typed in.
///
/// It used to open with سعر الدخول, سعر الهدف and سعر وقف الخسارة. The entry is
/// something the trader typed two fields above; the other two now appear
/// underneath their own inputs the moment either half is known (see
/// [LevelField]). Reading them back a third time pushed the four figures that
/// are actually an answer — how many shares, what it costs, what it wins, what
/// it loses — below the fold on a phone.
///
/// «أقصى خسارة مسموحة» went the same way: it is capital × risk% from settings,
/// identical on every trade, so it belongs beside the risk it bounds rather
/// than on a row of its own.
class TradeSummaryCard extends StatelessWidget {
  final SmartTradePlan plan;

  const TradeSummaryCard({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final quality = plan.quality;
    final positive = plan.rewardBeatsRisk;
    final resolved = plan.rewardRiskRatio != null;
    final accent = positive ? colors.win : colors.loss;

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: resolved ? accent : theme.colorScheme.outlineVariant,
          width: resolved ? 1.5 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'ملخص الصفقة',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                // The verdict, as one badge instead of a ratio in the header
                // and an emoji banner underneath it saying the same thing.
                if (quality != null)
                  _QualityBadge(quality: quality, plan: plan),
              ],
            ),

            if (!resolved) ...[
              const SizedBox(height: 12),
              Text(
                'اكتب سعر الدخول وحدّد الهدف والاستوب، والباقي هيتحسب هنا.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ] else ...[
              const SizedBox(height: 16),
              // Two by two, so the pair a trader compares sits side by side:
              // the size on top, the two outcomes it produces underneath.
              Row(
                children: [
                  Expanded(
                    child: _Tile(
                      label: 'الأسهم المقترحة',
                      value: quantity(plan.sizing.effectiveQty),
                      big: true,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _Tile(
                      label: 'قيمة المركز',
                      value: money(plan.sizing.positionValue),
                      big: true,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _Tile(
                      label: 'لو وصل الهدف',
                      value: signedMoney(plan.expectedProfit),
                      color: colors.win,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _Tile(
                      label: 'لو ضرب الاستوب',
                      value: signedMoney(plan.expectedLoss),
                      color: colors.loss,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _RiskLine(plan: plan),
            ],

            if (plan.sizing.overRisk) ...[
              const SizedBox(height: 12),
              const RiskWarning(),
            ],

            const SizedBox(height: 16),
            _CopyRow(plan: plan),
          ],
        ),
      ),
    );
  }
}

class _QualityBadge extends StatelessWidget {
  final TradeQuality quality;
  final SmartTradePlan plan;

  const _QualityBadge({required this.quality, required this.plan});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final color = switch (quality) {
      TradeQuality.good => colors.win,
      TradeQuality.warning => colors.breakeven,
      TradeQuality.bad => colors.loss,
    };
    final icon = switch (quality) {
      TradeQuality.good => Icons.check_circle_rounded,
      TradeQuality.warning => Icons.warning_amber_rounded,
      TradeQuality.bad => Icons.cancel_rounded,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: colors.surfaceFor(color),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          // The ratio is the verdict's evidence, so the two travel together
          // rather than sitting at opposite ends of the header.
          NumericText(
            '${plan.rewardRiskRatio!.toStringAsFixed(2)}R',
            style: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            quality.plainLabel,
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  final bool big;

  const _Tile({
    required this.label,
    required this.value,
    this.color,
    this.big = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 2),
          // FittedBox, not a smaller font: a six-figure position value at
          // titleLarge does not fit half a 320px phone, and shrinking every
          // tile to suit the widest possible number wastes the space the rest
          // of the time.
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: AlignmentDirectional.centerStart,
            child: NumericText(
              value,
              style:
                  (big
                          ? theme.textTheme.titleLarge
                          : theme.textTheme.titleMedium)
                      ?.copyWith(fontWeight: FontWeight.bold, color: color),
            ),
          ),
        ],
      ),
    );
  }
}

/// The risk, with the limit it is measured against on the same line.
class _RiskLine extends StatelessWidget {
  final SmartTradePlan plan;

  const _RiskLine({required this.plan});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final over = plan.sizing.overRisk;

    // Two lines, not one. Laid out as label + «2.0%» + « من » + «340.00 ج.م» +
    // « مسموحة» in a single Row it overflowed by 76px at 320 — four fixed
    // children after an Expanded label cannot shrink, so the row simply ran off
    // the card.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'المخاطرة من رأس المال',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(width: 12),
            NumericText(
              percent(plan.sizing.riskPct),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: over ? colors.loss : null,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text.rich(
          TextSpan(
            children: [
              const TextSpan(text: 'حدّك المسموح '),
              // The figure keeps its own LTR run so «ج.م» cannot jump to the
              // head of the line — the same reason NumericText exists.
              WidgetSpan(
                alignment: PlaceholderAlignment.middle,
                child: NumericText(
                  money(plan.sizing.maxLoss),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const TextSpan(text: ' على الصفقة'),
            ],
          ),
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _CopyRow extends StatelessWidget {
  final SmartTradePlan plan;

  const _CopyRow({required this.plan});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _CopyChip(
          label: 'نسخ سعر الهدف',
          // Copied as a bare number so it can be pasted straight into a broker
          // order ticket.
          value: plan.takeProfitPrice?.toStringAsFixed(2),
        ),
        _CopyChip(
          label: 'نسخ سعر وقف الخسارة',
          value: plan.stopLossPrice?.toStringAsFixed(2),
        ),
        _CopyChip(
          label: 'نسخ الكمية',
          value: plan.sizing.effectiveQty?.toString(),
        ),
      ],
    );
  }
}

class _CopyChip extends StatelessWidget {
  final String label;
  final String? value;

  const _CopyChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final enabled = value != null;
    return ActionChip(
      avatar: const Icon(Icons.copy_rounded, size: 16),
      label: Text(label),
      onPressed: enabled
          ? () async {
              await Clipboard.setData(ClipboardData(text: value!));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('اتنسخ: $value'),
                  duration: const Duration(seconds: 1),
                ),
              );
            }
          : null,
    );
  }
}
