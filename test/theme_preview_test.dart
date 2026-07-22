// Throwaway harness: renders the themed components to PNG for visual review.
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:egx_trade_journal/core/calc/trade_metrics.dart';
import 'package:egx_trade_journal/core/theme.dart';
import 'package:egx_trade_journal/core/widgets/risk_warning.dart';
import 'package:egx_trade_journal/today/widgets/no_tasks_banner.dart';
import 'package:egx_trade_journal/trades/widgets/result_badge.dart';

Widget _panel(String heading) => Builder(
  builder: (context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final colors = context.resultColors;

    Widget label(String t) => Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        t,
        style: TextStyle(
          fontSize: 10,
          letterSpacing: 1.2,
          fontWeight: FontWeight.w700,
          color: cs.onSurfaceVariant,
        ),
      ),
    );

    Widget swatch(String name, Color c) => Container(
      width: 92,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: c,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: cs.outlineVariant),
      ),
      child: Text(
        name,
        style: TextStyle(
          fontSize: 9,
          color: ThemeData.estimateBrightnessForColor(c) == Brightness.dark
              ? Colors.white
              : Colors.black87,
        ),
      ),
    );

    return Container(
      width: 420,
      color: theme.scaffoldBackgroundColor,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            heading,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: cs.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'scaffold / surface / tokens',
            style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
          ),
          const SizedBox(height: 16),

          // A card, drawn exactly as cardTheme specifies.
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: cs.primaryContainer,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          Icons.auto_graph_rounded,
                          size: 18,
                          color: cs.primary,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Summary card',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: cs.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      for (final t in [
                        ('open', cs.surfaceContainerHighest, cs.onSurface),
                        ('win', colors.winSurface, colors.win),
                        ('loss', colors.lossSurface, colors.loss),
                        ('flat', colors.breakevenSurface, colors.breakeven),
                      ])
                        Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: t.$2,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '12',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: t.$3,
                                ),
                              ),
                              Text(
                                t.$1,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: cs.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Divider(color: cs.outlineVariant, height: 1),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Secondary label',
                        style: TextStyle(
                          fontSize: 13,
                          color: cs.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        'Muted / outline',
                        style: TextStyle(fontSize: 13, color: cs.outline),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),

          label('RESULT BADGES'),
          Row(
            children: [
              for (final r in TradeResult.values)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ResultBadge(r),
                ),
            ],
          ),
          const SizedBox(height: 18),

          label('BANNERS'),
          const NoTasksBanner(),
          const SizedBox(height: 10),
          const RiskWarning(),
          const SizedBox(height: 18),

          label('NEUTRAL RAMP'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              swatch('background', theme.scaffoldBackgroundColor),
              swatch('surface', cs.surface),
              swatch('container\nHighest', cs.surfaceContainerHighest),
              swatch('outline\nVariant', cs.outlineVariant),
            ],
          ),
          const SizedBox(height: 10),
          label('BRAND + SEMANTIC'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              swatch('primary', cs.primary),
              swatch('win', colors.win),
              swatch('loss', colors.loss),
              swatch('breakeven', colors.breakeven),
            ],
          ),
        ],
      ),
    );
  },
);

void main() {
  testWidgets('render theme preview', (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(880, 1000);
    addTearDown(tester.view.reset);

    final key = GlobalKey();

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.ltr,
        child: RepaintBoundary(
          key: key,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Theme(data: AppTheme.light(), child: _panel('Light')),
              Theme(data: AppTheme.dark(), child: _panel('Dark')),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final boundary =
        key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 2.0);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    File(
      r'C:\Users\spark\AppData\Local\Temp\claude\D--Flutter-apps-Stock\cb733691-593b-41f5-86b2-5f95d5e5c8c4\scratchpad\theme_preview.png',
    ).writeAsBytesSync(bytes!.buffer.asUint8List());
  });
}
