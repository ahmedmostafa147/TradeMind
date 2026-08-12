import 'package:flutter/material.dart';

import '../../../shell/home_shell.dart';
import '../../../core/formatters.dart';
import '../../../core/theme.dart';
import '../models/market_flows.dart';
import '../services/market_flows_service.dart';

/// «السوق» — who bought and who sold, from the exchange's own daily split.
///
/// The counterpart of site/components/dashboard/market-flows-panel.tsx, and the
/// half of the product a journal alone cannot give: not what a stock did, but
/// who moved it.
///
/// It states facts and draws no conclusion. That is both what the disclaimer
/// requires and what makes the data worth showing — a trader who reads that
/// foreign institutions were net buyers three sessions running does not need to
/// be told what to do about it.
class MarketScreen extends StatefulWidget {
  const MarketScreen({super.key});

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  late Future<List<MarketFlows>> _future;
  InvestorClass _investorClass = InvestorClass.all;

  @override
  void initState() {
    super.initState();
    _future = MarketFlowsService.fetchRecent();
  }

  Future<void> _refresh() async {
    final next = MarketFlowsService.fetchRecent();
    setState(() => _future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('السوق'),
        actions: const [SettingsAction()],
      ),
      body: FutureBuilder<List<MarketFlows>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            // A STATIC placeholder, not a CircularProgressIndicator.
            //
            // HomeShell builds its tabs inside an IndexedStack, so this screen
            // is constructed at launch whether or not it is the visible tab,
            // and a spinner is an animation that never stops scheduling
            // frames. Any widget test that pumps the shell and calls
            // pumpAndSettle would then wait on an offscreen tab for ever. The
            // read either resolves within a frame or falls through to the
            // empty state below, so there is nothing for a spinner to express.
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('بيحمّل...'),
              ),
            );
          }

          final sessions = snapshot.data ?? const <MarketFlows>[];
          if (sessions.isEmpty) return _Empty(onRetry: _refresh);

          final latest = sessions.first;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
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
                  _History(
                    sessions: sessions,
                    investorClass: _investorClass,
                  ),
                ],
                const SizedBox(height: 16),
                _SourceNote(),
              ],
            ),
          );
        },
      ),
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

class _Empty extends StatelessWidget {
  final Future<void> Function() onRetry;
  const _Empty({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('لسه مفيش بيانات سوق', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'أرقام تداولات المستثمرين بتتسجّل لكل جلسة. أول ما تتخزّن جلسة '
              'هتلاقيها هنا.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: onRetry,
              child: const Text('حدّث'),
            ),
          ],
        ),
      ),
    );
  }
}
