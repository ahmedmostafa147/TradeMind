import 'dart:io';

import 'package:egx_trade_journal/core/formatters.dart';
import 'package:flutter_test/flutter_test.dart';

/// Arabic counted nouns take four forms, and the product is Arabic-only by an
/// explicit owner decision — so this is the surface, not a detail.
void main() {
  test('each band takes its own form', () {
    expect(sessionsPhrase(1), 'جلسة واحدة');
    expect(sessionsPhrase(2), 'جلستين');
    expect(sessionsPhrase(3), '3 جلسات');
    expect(sessionsPhrase(10), '10 جلسات');
    expect(sessionsPhrase(11), '11 جلسة');
    expect(sessionsPhrase(30), '30 جلسة');
  });

  test('the dual and the singular carry no numeral', () {
    // «2 جلستين» and «1 جلسة واحدة» are both wrong.
    expect(sessionsPhrase(1).contains('1'), isFalse);
    expect(sessionsPhrase(2).contains('2'), isFalse);
  });

  test('zero reads as a plural, which is what the language does', () {
    expect(sessionsPhrase(0), '0 جلسة');
  });

  /// The web copy is a MIRROR, and CLAUDE.md §5 says a mirror with no test
  /// drifts silently. This reads the TypeScript itself, the same trick
  /// legal_notice_test.dart uses on site.ts.
  test('the TypeScript mirror carries the same four forms', () {
    final source = File('site/lib/format.ts').readAsStringSync();
    expect(source.contains('sessionsPhrase'), isTrue);
    for (final form in ['جلسة واحدة', 'جلستين', 'جلسات']) {
      expect(
        source.contains(form),
        isTrue,
        reason: 'site/lib/format.ts is missing the «$form» form',
      );
    }
  });
}
