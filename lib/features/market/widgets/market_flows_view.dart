import 'package:flutter/material.dart';

import '../../../core/calc/flows_history.dart';
import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../models/market_flows.dart';
import '../services/market_flows_service.dart';

/// «مين اشترى ومين باع» — the exchange's own daily investor split.
///
/// ── WHY THIS IS A SECTION AND NOT A SCREEN ANY MORE ────────────────────────
///
/// It was the whole of «السوق» until the screen was rebuilt around TradingView's
/// top movers, which left `MarketFlowsService` and `market_flows.dart` compiled
/// but unreachable — and left the app's «السوق» showing strictly less than the
/// site's, whose panel has carried movers AND flows all along. Same tab, same
/// two things, same order on both surfaces.
///
/// It states facts and draws no conclusion. That is both what the disclaimer
/// requires and what makes the data worth showing — a trader who reads that
/// foreign institutions were net buyers three sessions running does not need to
/// be told what to do about it.
///
/// ── IT RENDERS NOTHING WHEN THERE IS NOTHING ───────────────────────────────
///
/// The sessions are typed in by hand (egx.com.eg sits behind F5 bot defence, so
/// nothing scrapes it), and `fetchRecent` cannot tell an empty feed from an
/// unreachable one — it returns `[]` for both. On a screen that already has the
/// movers above it, an apologetic empty card would be the loudest thing on the
/// page for a reason the reader cannot act on, so the section simply is not
/// there until a session exists.
class MarketFlowsView extends StatefulWidget {
  const MarketFlowsView({super.key});

  @override
  State<MarketFlowsView> createState() => _MarketFlowsViewState();
}

class _MarketFlowsViewState extends State<MarketFlowsView> {
  late Future<List<MarketFlows>> _future;
  InvestorClass _investorClass = InvestorClass.all;

  @override
  void initState() {
    super.initState();
    _future = MarketFlowsService.fetchRecent();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<MarketFlows>>(
      future: _future,
      builder: (context, snapshot) {
        final sessions = snapshot.data ?? const <MarketFlows>[];
        if (sessions.isEmpty) return const SizedBox.shrink();

        final latest = sessions.first;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Header(date: latest.date),
            const SizedBox(height: 12),
            _ClassPicker(
              value: _investorClass,
              onChanged: (v) => setState(() => _investorClass = v),
            ),
            const SizedBox(height: 16),
            for (final nationality in Nationality.values) ...[
              _NetCard(
                label: nationality.label,
                row: latest.table(_investorClass)[nationality]!,
              ),
              const SizedBox(height: 12),
            ],
            if (sessions.length > 1) ...[
              const SizedBox(height: 8),
              _History(sessions: sessions, investorClass: _investorClass),
            ],
            const SizedBox(height: 16),
            _SourceNote(),
          ],
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final String date;
  const _Header({required this.date});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('مين اشترى ومين باع', style: theme.textTheme.titleMedium),
        const SizedBox(height: 4),
        NumericText(
          date,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _ClassPicker extends StatelessWidget {
  final InvestorClass value;
  final ValueChanged<InvestorClass> onChanged;

  const _ClassPicker({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<InvestorClass>(
      segments: [
        for (final option in InvestorClass.values)
          ButtonSegment(value: option, label: Text(option.label)),
      ],
      selected: {value},
      showSelectedIcon: false,
      onSelectionChanged: (selection) => onChanged(selection.first),
    );
  }
}

/// One group's net.
///
/// WIN/LOSS COLOURS, FOR THE ONE REASON THE PALETTE ALLOWS: this is money with
/// a direction, which is exactly what those tokens mean everywhere else. Green
/// is net buying and red is net selling — NOT "good" and "bad" — and the words
/// «صافي شراء»/«صافي بيع» carry the meaning so the colour never carries it
/// alone.
class _NetCard extends StatelessWidget {
  final String label;
  final FlowRow row;

  const _NetCard({required this.label, required this.row});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final buying = row.net > 0;
    final flat = row.net == 0;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: theme.textTheme.titleSmall),
                Text(
                  flat ? 'متعادل' : (buying ? 'صافي شراء' : 'صافي بيع'),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            NumericText(
              signedMoney(row.net),
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: flat ? null : (buying ? colors.win : colors.loss),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _Pair(label: 'اشترى', value: money(row.bought)),
                _Pair(label: 'باع', value: money(row.sold)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Pair extends StatelessWidget {
  final String label;
  final String value;
  const _Pair({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Text(
          '$label ',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        NumericText(value, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

class _History extends StatelessWidget {
  final List<MarketFlows> sessions;
  final InvestorClass investorClass;

  const _History({required this.sessions, required this.investorClass});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('الجلسات السابقة', style: theme.textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(
              'صافي التعامل — ${investorClass.label}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),

            // THE READING, ABOVE THE ROWS — and the same reading the website
            // prints, because `flowRun` lives in lib/core/calc/ and the site
            // runs it compiled rather than reimplemented (CLAUDE.md §24). The
            // table below is still there; what it could never do is say how
            // long the current run is without the reader counting rows.
            for (final nationality in Nationality.values) ...[
              _RunLine(
                nationality: nationality,
                run: flowRun([
                  for (final s in sessions) s.table(investorClass)[nationality]?.net,
                ]),
              ),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 4),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 24,
                columns: [
                  const DataColumn(label: Text('التاريخ')),
                  for (final n in Nationality.values)
                    DataColumn(label: Text(n.label)),
                ],
                rows: [
                  for (final session in sessions)
                    DataRow(
                      cells: [
                        DataCell(NumericText(session.date)),
                        for (final n in Nationality.values)
                          DataCell(
                            NumericText(
                              signedMoney(session.table(investorClass)[n]!.net),
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: switch (session
                                    .table(investorClass)[n]!
                                    .net) {
                                  > 0 => colors.win,
                                  < 0 => colors.loss,
                                  _ => null,
                                },
                              ),
                            ),
                          ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SourceNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      'المصدر: البورصة المصرية — تداولات المستثمرين. الأرقام زي ما البورصة '
      'نشرتها، وممكن تتعدّل بعد إقفال الجلسة. دي بيانات تاريخية عن اللي حصل، '
      'مش توصية ولا تحليل.',
      style: theme.textTheme.bodySmall?.copyWith(
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

/// One nationality's streak and running total, above the table of rows.
///
/// THE DENOMINATOR IS PRINTED WITH THE TOTAL. The sessions are entered by hand
/// and a day can simply be missing, so a sum with no count behind it is a
/// figure the reader cannot check.
///
/// COLOUR ONLY ON THE MONEY. Green and red mean profit and loss everywhere in
/// this product; colouring «5 جلسات» green would turn a count of buying
/// sessions into a claim that they were good ones.
class _RunLine extends StatelessWidget {
  final Nationality nationality;
  final FlowRun? run;

  const _RunLine({required this.nationality, required this.run});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;
    final muted = theme.colorScheme.onSurfaceVariant;

    if (run == null) {
      return Row(
        children: [
          Expanded(
            child: Text(nationality.label, style: theme.textTheme.labelLarge),
          ),
          Text(
            'مفيش جلسات مقروءة',
            style: theme.textTheme.bodySmall?.copyWith(color: muted),
          ),
        ],
      );
    }

    final total = run!.total;
    final color = total > 0
        ? colors.win
        : total < 0
        ? colors.loss
        : muted;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(nationality.label, style: theme.textTheme.labelLarge),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              signedMoney(total),
              style: theme.textTheme.titleSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              run!.hasRun
                  ? 'على ${sessionsPhrase(run!.sessions)} · '
                        '${sessionsPhrase(run!.runLength)} '
                        '${run!.runBuying! ? "شراء" : "بيع"} '
                        'على التوالي'
                  : 'على ${sessionsPhrase(run!.sessions)}',
              style: theme.textTheme.bodySmall?.copyWith(color: muted),
            ),
          ],
        ),
      ],
    );
  }
}
