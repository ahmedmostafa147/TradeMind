import 'package:flutter/material.dart';

import '../../trades/widgets/quick_add_trade_sheet.dart';

/// What a brand-new user sees first.
///
/// It used to read "ابدأ من «حاسبة الصفقة»" — a screen with nothing on it,
/// naming a different tab. That leaves the one person who most needs a next
/// step with a sentence to obey instead of a button to press. The action lives
/// here now, and the wording says what the app is for rather than where to go.
class TodayEmptyState extends StatelessWidget {
  const TodayEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.task_alt_rounded,
                size: 56,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'ابدأ أول صفقة',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              'سجّل الصفقة بسعر الدخول ووقف الخسارة، '
              'والتطبيق هيقولك تشتري كام سهم من غير ما تتعدى حد المخاطرة بتاعك.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => openQuickAddSheet(context),
              icon: const Icon(Icons.add_rounded),
              label: const Text(kAddTradeLabel),
            ),
          ],
        ),
      ),
    );
  }
}
