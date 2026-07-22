import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../core/calc/journal_stats.dart';
import '../../core/formatters.dart';
import '../../core/theme.dart';

/// Running equity ordered by exit date, starting from capital.
class EquityChart extends StatelessWidget {
  final List<EquityPoint> points;
  final double startingCapital;

  const EquityChart({
    super.key,
    required this.points,
    required this.startingCapital,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.resultColors;

    if (points.isEmpty) {
      return SizedBox(
        height: 200,
        child: Center(
          child: Text(
            'الرسم البياني هيظهر بعد أول صفقة مغلقة',
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final spots = [
      for (var i = 0; i < points.length; i++)
        FlSpot(i.toDouble(), points[i].equity),
    ];

    final equities = points.map((p) => p.equity).toList();
    var minY = equities.reduce((a, b) => a < b ? a : b);
    var maxY = equities.reduce((a, b) => a > b ? a : b);

    // A flat curve (a single point, or several that net to zero) would give a
    // zero-height range, which fl_chart cannot lay out. Pad it manually.
    if (maxY - minY < 1) {
      minY -= 1;
      maxY += 1;
    }
    final padding = (maxY - minY) * 0.12;

    final ended = points.last.equity;
    final lineColor = ended >= startingCapital ? colors.win : colors.loss;

    return SizedBox(
      height: 220,
      child: LineChart(
        LineChartData(
          minY: minY - padding,
          maxY: maxY + padding,
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            getDrawingHorizontalLine: (_) =>
                FlLine(color: theme.colorScheme.outlineVariant, strokeWidth: 1),
          ),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(),
            rightTitles: const AxisTitles(),
            bottomTitles: const AxisTitles(),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 56,
                getTitlesWidget: (value, meta) => Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: NumericText(
                    quantity(value.round()),
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipItems: (touched) => [
                for (final spot in touched)
                  LineTooltipItem(
                    money(spot.y),
                    TextStyle(
                      color: theme.colorScheme.onInverseSurface,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
              ],
            ),
          ),
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: false,
              color: lineColor,
              barWidth: 2.5,
              dotData: FlDotData(show: points.length <= 30),
              belowBarData: BarAreaData(
                show: true,
                color: lineColor.withValues(alpha: 0.12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
