import 'dart:io';
import 'package:path_provider/path_provider.dart';

import '../calc/trade_metrics.dart';
import '../../trades/trade.dart';

/// Helper to generate and save CSV export of user trades.
class CsvExportHelper {
  static String generateCsv(
    List<Trade> trades, {
    double capital = 100000,
    double maxRiskPercent = 0.02,
  }) {
    final StringBuffer buffer = StringBuffer();
    buffer.writeln(
      'Ticker,Status,Entry Date,Exit Date,Entry Price,Stop Price,Exit Price,Quantity,PnL,R-Multiple,Notes',
    );

    for (final t in trades) {
      final metrics = TradeMetrics.of(
        t,
        capital: capital,
        maxRiskPercent: maxRiskPercent,
      );
      final entryDate = t.entryDate.toIso8601String().split('T').first;
      final exitDate = t.exitDate?.toIso8601String().split('T').first ?? '';
      final notesClean = (t.notes ?? '').replaceAll('\n', ' ').replaceAll(',', ' ');

      buffer.writeln(
        '${t.ticker},${t.status.name},$entryDate,$exitDate,'
        '${t.entryPrice},${t.stopPrice},${t.exitPrice ?? ""},'
        '${t.quantity},${metrics.pnl ?? ""},${metrics.rMultiple?.toStringAsFixed(2) ?? ""},"$notesClean"',
      );
    }
    return buffer.toString();
  }

  static Future<String> saveCsvFile(
    List<Trade> trades, {
    double capital = 100000,
    double maxRiskPercent = 0.02,
  }) async {
    final csvData = generateCsv(
      trades,
      capital: capital,
      maxRiskPercent: maxRiskPercent,
    );
    final directory = await getApplicationDocumentsDirectory();
    final file = File('${directory.path}/trades_export.csv');
    await file.writeAsString(csvData);
    return file.path;
  }
}
