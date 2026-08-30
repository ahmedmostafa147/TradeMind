import 'dart:io';

import 'package:egx_trade_journal/billing/entitlements.dart';
import 'package:flutter_test/flutter_test.dart';

/// Two owner rules that live in prose and keep getting broken by hand.
///
/// Both were already documented in CLAUDE.md, both were already applied across
/// the codebase, and both came back anyway — eleven emoji in five files, and a
/// «مباشر» badge over a source that declares no delay at all. Prose does not
/// enforce; this does. It reads the site's own source the way
/// `legal_notice_test.dart` reads `site.ts`, because there is no test runner on
/// the web side to put it in.
void main() {
  group('zero emoji on the site', () {
    test('no pictograph reaches a rendered string', () {
      final offenders = <String>[];

      for (final file in _siteSources()) {
        final lines = _withoutComments(file.readAsStringSync()).split('\n');
        for (var i = 0; i < lines.length; i++) {
          for (final rune in lines[i].runes) {
            if (_isBannedGlyph(rune)) {
              offenders.add(
                '${file.path}:${i + 1}  '
                'U+${rune.toRadixString(16).toUpperCase().padLeft(4, '0')}',
              );
            }
          }
        }
      }

      expect(
        offenders,
        isEmpty,
        reason:
            'Zero emoji on the site is an explicit owner preference — SVG icons '
            'only, from site/components/icons.tsx. An emoji renders as a '
            'different picture on every platform, cannot inherit currentColor, '
            'and reads as decoration in a product whose argument is discipline.'
            '\n\n${offenders.join('\n')}',
      );
    });
  });

  group('the legal pages describe the product that exists', () {
    test('the free switch reads the same on both surfaces', () {
      expect(
        _everythingFreeOnWeb(),
        kEverythingFree,
        reason:
            'EVERYTHING_FREE in site/lib/subscription.ts and kEverythingFree in '
            'lib/billing/entitlements.dart are two copies of one decision. They '
            'gate what a user can open; disagreeing means the phone and the '
            'browser hand the same account different products.',
      );
    });

    test('the policy promises no notice channel that does not exist', () {
      final privacy = _stripComments(
        File('site/app/(marketing)/privacy/page.tsx').readAsStringSync(),
      );

      expect(
        privacy.contains('هننبّه داخل رادار'),
        isFalse,
        reason:
            '§9 promised an in-app notice before any material change. The tab '
            'that would have carried it («المستجدات») was deleted with the '
            'collections behind it, so the promise outlived its only surface — '
            'and the 26 أغسطس revision shipped three substantive corrections '
            'with no notice at all. Build the surface before promising it '
            'again; §7 of the Terms is the wording that matches what the '
            'product does.',
      );
    });

    test('nothing is sold while everything is free', () {
      if (!kEverythingFree) return; // Plans are back; §6 should describe them.

      final terms = _stripComments(
        File('site/app/(marketing)/terms/page.tsx').readAsStringSync(),
      );

      // The exact wording that outlived the plans it described.
      //
      // ONLY PHRASES THAT CANNOT APPEAR IN A DENIAL. «تجديد تلقائي» and
      // «بوابة دفع» were in this list for one run and caught the replacement
      // text saying «ومفيش تجديد تلقائي» — the sentence promising the opposite
      // of what the guard was looking for. Same lesson as the «لحظي» rule
      // below: a word the honest copy also needs is the wrong thing to ban.
      const sellingPhrases = [
        'رادار Pro',
        'صفحة الباقات',
        '#pricing',
        'الباقة المجانية بتفضل',
        'أول ما تدفع',
      ];

      final found = [
        for (final phrase in sellingPhrases)
          if (terms.contains(phrase)) phrase,
      ];

      expect(
        found,
        isEmpty,
        reason:
            'The published Terms described «رادار Pro», linked to a pricing '
            'anchor that is no longer rendered, and told the reader to send a '
            'request «من داخل رادار» and pay outside — months after the plans '
            'were switched off. The Android app links to this page from its '
            'settings, so that removed instruction was still reachable from '
            'inside the app, which is the exact shape of the Play Billing '
            'problem it was removed to avoid. '
            ' Still present: '
            "${found.join(' · ')}",
      );
    });
  });

  group('nothing claims a live price', () {
    test('«لحظي» only ever appears denied', () {
      final offenders = <String>[];

      for (final file in [..._siteSources(), ..._appSources()]) {
        final source = _withoutComments(file.readAsStringSync());
        final lines = source.split('\n');
        for (var i = 0; i < lines.length; i++) {
          final line = lines[i];
          if (!_liveWords.any(line.contains)) continue;
          if (_denials.any(line.contains)) continue;
          offenders.add('${file.path}:${i + 1}  ${line.trim()}');
        }
      }

      expect(
        offenders,
        isEmpty,
        reason:
            'No source behind this product is live. TradingView declares a '
            '900-second delay on EGX and Yahoo answers with the last daily '
            'close; the exchange licenses real-time data and sells it. The '
            'claim was scrubbed from five places once already.'
            '\n\n${offenders.join('\n')}',
      );
    });
  });

  group('.num never lands on a table cell', () {
    test('no <td>, <th>, <Td> or <Th> carries the num class', () {
      final offenders = <String>[];

      for (final file in _siteSources()) {
        final source = _withoutComments(file.readAsStringSync());
        // MATCHED OVER THE WHOLE SOURCE, NOT LINE BY LINE — an opening tag
        // wraps as soon as its className is a template literal, which is
        // exactly the form the market flows table used:
        //
        //     <td
        //       className={`num py-2 font-bold ${
        //
        // The first version of this guard scanned one line at a time, and the
        // injection test caught it missing precisely that case. A guard that
        // cannot see the shape that actually shipped is decoration.
        for (final m in _numOnCell.allMatches(source)) {
          final line = '\n'.allMatches(source.substring(0, m.start)).length + 1;
          offenders.add(
            '${file.path}:$line  ${m.group(0)!.replaceAll('\n', ' ⏎ ').trim()}',
          );
        }
      }

      expect(
        offenders,
        isEmpty,
        reason:
            '`.num` in globals.css sets `display: inline-block` along with the '
            'LTR direction. On a <td> that stops the cell being a table-cell '
            'and drops it out of the column layout entirely — the header no '
            'longer sits over its data, and the same column lands at a '
            'different x on every row, because each escaped cell is sized by '
            'its own content instead of by the column.\n\n'
            'MEASURED on the admin users table: computed display came back '
            '`table-cell, inline-block, inline-block, inline-block, '
            'inline-block, table-cell, table-cell`, header right edges were '
            '[1184, 1030, 507, 392, 303, ...] against a first row of '
            '[1184, 1030, 877, 767, 657, ...], and rows 1-3 put one column at '
            '877, 819 and 830.\n\n'
            'Put it on a <span> around the number. CLAUDE.md §7 has said so '
            'in prose the whole time, and it was broken in three tables at '
            'once — the admin user list, the tag stats on the customer '
            'dashboard, and the market flows sessions table. Prose does not '
            'enforce; this does.'
            '\n\n${offenders.join('\n')}',
      );
    });
  });
}

/// A `td`/`th`/`Td`/`Th` opening tag whose className contains `num` as a whole
/// word.
///
/// Deliberately matches the OPENING TAG ONLY, so a `<span className="num">`
/// nested inside a cell — the correct form, and the fix — does not trip it.
/// `\b` around `num` keeps `num` from matching `numbers` or `tabular-nums`.
final RegExp _numOnCell = RegExp(
  r'''<(td|th|Td|Th)\b[^>]*className=(?:"[^"]*\bnum\b|\{`[^`]*\bnum\b)''',
);

/// `EVERYTHING_FREE` as the web declares it.
bool _everythingFreeOnWeb() {
  final source = File('site/lib/subscription.ts').readAsStringSync();
  final match = RegExp(
    r'export const EVERYTHING_FREE\s*=\s*(true|false)',
  ).firstMatch(source);
  expect(
    match,
    isNotNull,
    reason: 'site/lib/subscription.ts no longer exports EVERYTHING_FREE',
  );
  return match!.group(1) == 'true';
}

/// Prose ABOUT removed wording is not the wording. Both files carry comments
/// naming what they replaced, on purpose.
String _stripComments(String source) => _withoutComments(source);

/// The word, in the forms Arabic inflects it into.
///
/// PLAIN `contains`, NOT A REGEX. The first version of this guard used
/// `RegExp('(...)\s')` and the escape was lost on the way into the file,
/// leaving a pattern that required a literal "s" after an Arabic word. It
/// matched nothing, and a guard that matches nothing passes.
const _liveWords = ['لحظية', 'لحظيًا', 'لحظيا', 'لحظي'];

/// Stating the rule needs the word. «مش أسعار لحظية» is the product being
/// honest, not the product claiming.
const _denials = ['مش', 'ليست', 'ليس', 'غير'];

/// True emoji only.
///
/// The check and cross dingbats (✓ ✗) are deliberately NOT here: a `title=`
/// attribute is plain text and cannot hold an SVG, so the discipline-score
/// tooltip has no alternative to them.
bool _isBannedGlyph(int rune) =>
    (rune >= 0x1F300 && rune <= 0x1FAFF) || // pictographs, symbols, transport
    (rune >= 0x1F000 && rune <= 0x1F2FF) || // tiles, enclosed letters
    rune == 0x2728 || // ✨
    rune == 0x26A0 || // ⚠
    rune == 0x26A1 || // ⚡
    rune == 0x2705 || // ✅
    rune == 0x274C || // ❌
    rune == 0x2B50 || // ⭐
    rune == 0x2715 || // ✕  — XIcon exists
    rune == 0x2716; // ✖



/// User-facing web source. `.next/` and `node_modules/` are build output.
List<File> _siteSources() {
  final root = Directory('site');
  if (!root.existsSync()) return const [];
  return root
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) {
        final path = f.path.replaceAll(r'\', '/');
        if (path.contains('/node_modules/') || path.contains('/.next/')) {
          return false;
        }
        // Build tooling, not page content: next.config.ts prints a warning to
        // a terminal, where a glyph is the only icon there is.
        if (path.endsWith('/next.config.ts')) return false;
        return path.endsWith('.tsx') || path.endsWith('.ts');
      })
      .toList();
}

List<File> _appSources() => Directory('lib')
    .listSync(recursive: true)
    .whereType<File>()
    .where((f) => f.path.endsWith('.dart'))
    .toList();

/// Strips `//`, `/* */` and JSX `{/* */}` so a comment ABOUT a rule is not read
/// as a breach of it — icons.tsx explains which emoji it replaced, by name.
String _withoutComments(String source) {
  final withoutBlocks = source.replaceAll(
    RegExp(r'/\*[\s\S]*?\*/', multiLine: true),
    '',
  );
  return withoutBlocks
      .split('\n')
      .map((line) {
        final slashes = line.indexOf('//');
        if (slashes == -1) return line;
        // Not a comment if it is inside a URL or a quoted string.
        final head = line.substring(0, slashes);
        if (head.endsWith(':') || head.endsWith("'") || head.endsWith('"')) {
          return line;
        }
        return head;
      })
      .join('\n');
}
