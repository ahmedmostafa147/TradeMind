import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/csv_export_helper.dart';
import '../../settings/settings_providers.dart';
import '../../trades/trades_providers.dart';

class ExportCsvTile extends ConsumerWidget {
  const ExportCsvTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      leading: const Icon(Icons.download_rounded),
      title: const Text('تصدير الصفقات (CSV)'),
      subtitle: const Text('احتفظ بنسخة من جميع صفقاتك في ملف Excel/CSV'),
      onTap: () async {
        final trades = ref.read(tradesProvider);
        final settings = ref.read(settingsProvider);
        if (trades.isEmpty) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('لا توجد صفقات للتصدير.')),
          );
          return;
        }

        final path = await CsvExportHelper.saveCsvFile(
          trades,
          capital: settings.capital,
          maxRiskPercent: settings.maxRiskPercent,
        );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('تم حفظ الملف بنجاح: $path'),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      },
    );
  }
}
