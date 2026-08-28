import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../trades/cubit/trades_cubit.dart';
import '../cubit/settings_cubit.dart';

import '../../core/utils/csv_export_helper.dart';

class ExportCsvTile extends StatelessWidget {
  const ExportCsvTile({super.key});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: const Icon(Icons.download_rounded),
      title: const Text('تصدير الصفقات (CSV)'),
      subtitle: const Text('احتفظ بنسخة من جميع صفقاتك في ملف Excel/CSV'),
      onTap: () async {
        final trades = context.read<TradesCubit>().trades;
        final settings = context.read<SettingsCubit>().requireSettings;
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
