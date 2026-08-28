import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/state/app_state.dart';
import '../../settings/cubit/settings_cubit.dart';

import '../../core/utils/csv_export_helper.dart';

class ExportCsvView extends StatelessWidget {
  const ExportCsvView({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final trades = context.trades;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.file_download_outlined,
              size: 56,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'تصدير سجل الصفقات (CSV)',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'احصل على جميع صفقاتك المسجلة في ملف CSV منظم يمكنك فتحه في Excel أو Google Sheets.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () async {
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
              icon: const Icon(Icons.download_rounded),
              label: const Text('تنزيل ملف الصفقات (CSV)'),
            ),
          ],
        ),
      ),
    );
  }
}
