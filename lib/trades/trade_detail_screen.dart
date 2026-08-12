import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/calc/risk_score.dart';
import '../core/calc/trade_metrics.dart';
import '../core/formatters.dart';
import '../core/theme.dart';
import '../core/widgets/risk_warning.dart';
import '../settings/settings_providers.dart';
import 'checklist.dart';
import 'timeline_entry.dart';
import 'trade_form_screen.dart';
import 'trades_providers.dart';
import 'widgets/result_badge.dart';

/// Read-only view of a single trade. Editing lives behind the pencil, so the
/// page can be scrolled and read without any risk of changing the record.
class TradeDetailScreen extends ConsumerWidget {
  final String tradeId;

  const TradeDetailScreen({super.key, required this.tradeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trades = ref.watch(tradesProvider);
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);
    final colors = context.resultColors;

    final trade = trades.where((t) => t.id == tradeId).firstOrNull;
    // The record can vanish while this page is open — deleted from the list
    // behind it, or removed by a restore. Fall back instead of crashing.
    if (trade == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('الصفقة')),
        body: const Center(child: Text('الصفقة دي مابقتش موجودة')),
      );
    }

    final metrics = TradeMetrics.of(
      trade,
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
    );
    final score = RiskScore.of(
      trade,
      capital: settings.capital,
      maxRiskPercent: settings.maxRiskPercent,
    );

    final pnlColor = switch (metrics.result) {
      TradeResult.win => colors.win,
      TradeResult.loss => colors.loss,
      TradeResult.breakeven => colors.breakeven,
      TradeResult.open => colors.open,
    };

    return Scaffold(
      appBar: AppBar(
        title: Text(trade.ticker),
        actions: [
          if (trade.isFavorite)
            const Padding(
              padding: EdgeInsets.only(left: 8),
              child: Icon(Icons.star, size: 20),
            ),
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'تعديل',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => TradeFormScreen(existing: trade),
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      ResultBadge(metrics.result, status: trade.status),
                      const SizedBox(width: 8),
                      Chip(
                        label: Text(trade.status.label),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ReadoutRow(
                    label: 'الربح/الخسارة',
                    value: metrics.pnl == null
                        ? kEmptyValue
                        : signedMoney(metrics.pnl),
                    valueColor: metrics.pnl == null ? null : pnlColor,
                    emphasise: true,
                  ),
                  ReadoutRow(
                    label: 'مضاعف R',
                    value: rMultiple(metrics.rMultiple),
                    valueColor: metrics.rMultiple == null ? null : pnlColor,
                    emphasise: true,
                  ),
                  ReadoutRow(
                    label: 'العائد',
                    value: percent(metrics.returnPct),
                    valueColor: metrics.returnPct == null ? null : pnlColor,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          if (metrics.overRisk) ...[
            const RiskWarning(),
            const SizedBox(height: 12),
          ],

          _Section(
            title: 'تفاصيل الصفقة',
            child: Column(
              children: [
                ReadoutRow(
                  label: 'تاريخ الدخول',
                  value: dateLabel(trade.entryDate),
                ),
                ReadoutRow(label: 'سعر الدخول', value: money(trade.entryPrice)),
                ReadoutRow(label: 'سعر الاستوب', value: money(trade.stopPrice)),
                // The one level the detail page never showed, even though the
                // form asks for it and the scenarios project from it.
                ReadoutRow(
                  label: 'الهدف',
                  value: money(trade.takeProfitPrice),
                ),
                ReadoutRow(label: 'عدد الأسهم', value: quantity(trade.quantity)),
                ReadoutRow(
                  label: 'قيمة المركز',
                  value: money(metrics.positionValue),
                ),
                const Divider(height: 20),
                ReadoutRow(
                  label: 'سعر الخروج',
                  value: money(trade.exitPrice),
                ),
                ReadoutRow(
                  label: 'تاريخ الخروج',
                  value: dateLabel(trade.exitDate),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          _Section(
            title: 'المخاطرة',
            child: Column(
              children: [
                ReadoutRow(
                  label: 'المخاطرة بالجنيه',
                  value: money(metrics.riskEgp),
                ),
                ReadoutRow(
                  label: 'نسبة المخاطرة',
                  value: percent(metrics.riskPct),
                  valueColor: metrics.overRisk ? colors.loss : null,
                ),
                const Divider(height: 20),
                _RiskScoreBar(score: score),
              ],
            ),
          ),
          const SizedBox(height: 12),

          _Section(
            title: 'سبب الدخول',
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: Text(trade.reason),
            ),
          ),
          const SizedBox(height: 12),

          if (trade.tags.isNotEmpty) ...[
            _Section(
              title: 'التصنيفات',
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final tag in trade.tags)
                      Chip(
                        label: Text(tag),
                        visualDensity: VisualDensity.compact,
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (trade.completedChecklistItems.isNotEmpty) ...[
            _Section(
              title:
                  'قائمة التحقق  ·  '
                  '${percent(checklistCompletion(trade.completedChecklistItems))}',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final item in ChecklistItem.values)
                    Row(
                      children: [
                        Icon(
                          trade.completedChecklistItems.contains(item.id)
                              ? Icons.check_circle
                              : Icons.radio_button_unchecked,
                          size: 18,
                          color: trade.completedChecklistItems.contains(item.id)
                              ? colors.win
                              : theme.colorScheme.outline,
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(item.label)),
                      ],
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (trade.screenshotPaths.isNotEmpty) ...[
            _Section(
              title: 'الصور',
              child: _Gallery(paths: trade.screenshotPaths),
            ),
            const SizedBox(height: 12),
          ],

          if (trade.timeline.isNotEmpty) ...[
            _Section(
              title: 'الأحداث',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final entry in _sortedTimeline(trade.timeline))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Icon(
                              Icons.circle,
                              size: 8,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                NumericText(
                                  dateLabel(entry.date),
                                  style: theme.textTheme.bodySmall,
                                ),
                                Text(entry.text),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (trade.notes != null && trade.notes!.trim().isNotEmpty)
            _Section(
              title: 'الدرس / ملاحظة',
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: Text(trade.notes!),
              ),
            ),
        ],
      ),
    );
  }

  /// Oldest first, so the story reads top to bottom.
  static List<TimelineEntry> _sortedTimeline(List<TimelineEntry> entries) =>
      [...entries]..sort((a, b) => a.date.compareTo(b.date));
}

class _RiskScoreBar extends StatelessWidget {
  final RiskScore score;

  const _RiskScoreBar({required this.score});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final color = switch (score.grade) {
      RiskGrade.excellent => colors.win,
      RiskGrade.good => colors.win,
      RiskGrade.average => colors.breakeven,
      RiskGrade.poor => colors.loss,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('تقييم الانضباط', style: theme.textTheme.bodyMedium),
            NumericText(
              '${score.value}/100 · ${score.grade.label}',
              style: theme.textTheme.titleSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: score.value / 100,
            minHeight: 6,
            color: color,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
          ),
        ),
        const SizedBox(height: 10),
        _ScoreItem('قائمة التحقق مكتملة', score.checklistComplete),
        _ScoreItem('المخاطرة داخل الحد', score.riskWithinLimit),
        _ScoreItem('فيه استوب', score.hasStop),
        _ScoreItem('سبب مفصّل', score.hasDetailedReason),
        // «فيه صور» was a fifth row here. The score dropped that component
        // because the website could never earn it; the images themselves are
        // still shown in the gallery above when a trade has any.
      ],
    );
  }
}

class _ScoreItem extends StatelessWidget {
  final String label;
  final bool earned;

  const _ScoreItem(this.label, this.earned);

  @override
  Widget build(BuildContext context) {
    final colors = context.resultColors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(
            earned ? Icons.check : Icons.close,
            size: 16,
            color: earned ? colors.win : Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          NumericText(
            earned ? '+20' : '0',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _Gallery extends StatelessWidget {
  final List<String> paths;

  const _Gallery({required this.paths});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 120,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: paths.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) => GestureDetector(
          onTap: () => _openFullScreen(context, paths[index]),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: _Thumbnail(path: paths[index]),
          ),
        ),
      ),
    );
  }

  void _openFullScreen(BuildContext context, String path) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(),
          backgroundColor: Colors.black,
          body: Center(
            child: InteractiveViewer(child: _Thumbnail(path: path, fit: null)),
          ),
        ),
      ),
    );
  }
}

/// A file referenced by a trade can be missing — the user cleared app storage,
/// or restored a backup onto a different device. Show a placeholder rather than
/// letting the exception reach the framework.
class _Thumbnail extends StatelessWidget {
  final String path;
  final BoxFit? fit;

  const _Thumbnail({required this.path, this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    final file = File(path);
    if (!file.existsSync()) {
      return Container(
        width: 120,
        height: 120,
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Icon(
          Icons.broken_image_outlined,
          color: Theme.of(context).colorScheme.outline,
        ),
      );
    }
    return Image.file(
      file,
      width: fit == null ? null : 120,
      height: fit == null ? null : 120,
      fit: fit,
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}
