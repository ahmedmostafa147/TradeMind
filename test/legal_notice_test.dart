import 'dart:io';

import 'package:egx_trade_journal/settings/widgets/legal_tiles.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The app carried NO disclaimer and NO link to the legal documents — not in
/// settings, not in onboarding, nowhere — while the website stated the same
/// sentence on every marketing page and in its own settings tab.
///
/// `RELEASE.md` requires the "not investment advice" line stated outright so
/// Play does not file the app under its restricted financial categories, and
/// CLAUDE.md §3 requires the wording to stay identical across the two surfaces.
/// This reads the site's own source so the two cannot drift silently.
void main() {
  test('the disclaimer is word for word the site\'s', () {
    final source = File('site/lib/site.ts').readAsStringSync();

    // The TS constant is a concatenation of quoted chunks; rebuild the string
    // the way the bundler would, then compare.
    final block = RegExp(
      r"export const disclaimer =\s*([\s\S]*?);",
    ).firstMatch(source);
    expect(block, isNotNull, reason: 'site.ts no longer exports `disclaimer`');

    final chunks = RegExp("'([^']*)'").allMatches(block!.group(1)!);
    final fromSite = chunks.map((m) => m.group(1)!).join();

    expect(
      kDisclaimer,
      fromSite,
      reason: 'the phone and the browser must say the same sentence',
    );
  });

  test('the contact address matches the site\'s', () {
    final source = File('site/lib/site.ts').readAsStringSync();
    final match = RegExp("contactEmail: '([^']+)'").firstMatch(source);
    expect(match, isNotNull);
    expect(kContactEmail, match!.group(1));
  });

  testWidgets('the three documents are reachable from الإعدادات', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: Scaffold(body: SingleChildScrollView(child: LegalTiles())),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('تنويه'), findsOneWidget);
    expect(find.textContaining('لا يقدّم نصائح أو توصيات استثمارية'),
        findsOneWidget);
    expect(find.text('سياسة الخصوصية'), findsOneWidget);
    expect(find.text('شروط الاستخدام'), findsOneWidget);
    expect(find.text('تواصل معنا'), findsOneWidget);
  });

  test('the site URL is absolute and https', () {
    // A relative or http link opens nothing useful from a phone, and Play
    // flags cleartext traffic.
    expect(kSiteUrl, startsWith('https://'));
    expect(kSiteUrl, isNot(endsWith('/')));
  });
}
