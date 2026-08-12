import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// THE APP SHIPS NO PURCHASE DIRECTION. THIS READS THE SOURCE TO PROVE IT.
///
/// Google Play requires in-app purchases of digital content to go through Play
/// Billing. Radar has no Play Billing integration, so the app must not sell,
/// price, or point at a way to pay for anything — and «الاشتراك بيتم يدوي
/// دلوقتي: ابعتلنا… وأول ما تدفع بنفعّله على حسابك» was doing all three at once
/// on the paywall of a build about to be submitted. Rejection there costs a
/// review cycle; removal after the fact costs the listing.
///
/// It scans the SOURCE rather than pumping widgets because the risk is a string
/// appearing anywhere in `lib/` — a snackbar, a tooltip, a settings tile, a
/// screen nobody thought about. A widget test can only check the screens it
/// happens to visit, and the last one to reach this copy visited three of the
/// four surfaces that carried it.
///
/// Selling lives on the WEBSITE, where Play's policy does not reach:
/// `site/components/dashboard/subscribe-dialog.tsx` and `pricing.tsx` are
/// expected to be full of exactly these words, which is why this only reads
/// `lib/`.
void main() {
  /// Substrings that constitute selling, pricing, or directing to payment.
  ///
  /// Deliberately narrow. «باقة» is NOT here — `Paywall.lockedLabel` says «مش
  /// متاح في باقتك الحالية», and naming a plan tier is not a purchase
  /// instruction. What Play forbids is telling the user how to pay.
  const banned = <String, String>{
    'ابعتلنا': 'directs the user to contact the operator to pay',
    'بنفعّله': 'describes a manual activation after payment',
    'رادار Pro': 'advertises a paid plan by name',
    'Radar Pro': 'advertises a paid plan by name',
    'اشترك': 'a call to action to subscribe',
    'الاشتراك': 'refers to the act of subscribing',
    'ج.م شهريًا': 'a price',
    'محتاج اشتراك': 'names a subscription as the remedy',
    'instapay': 'a payment method',
    'إنستاباي': 'a payment method',
  };

  /// Money words that are legitimate everywhere else in a trading journal —
  /// «الربح», «ج.م» on a P&L — so only files that could plausibly carry billing
  /// copy are worth reading. In practice that is all of `lib/`, minus nothing:
  /// the point is that NO file may carry it.
  final lib = Directory('lib');

  test('no file under lib/ contains purchase-direction copy', () {
    expect(
      lib.existsSync(),
      isTrue,
      reason: 'run from the package root; lib/ was not found',
    );

    final offences = <String>[];

    for (final entity in lib.listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('.dart')) continue;

      final source = entity.readAsStringSync();
      final lines = source.split('\n');

      for (var i = 0; i < lines.length; i++) {
        final line = lines[i];

        // Comments are exempt. Every one of these words appears in the notes
        // explaining WHY the copy was removed — including the note at the top of
        // paywall.dart, which quotes the offending sentence in full. A test that
        // failed on its own explanation would be deleted rather than obeyed.
        final trimmed = line.trimLeft();
        if (trimmed.startsWith('//') || trimmed.startsWith('///')) continue;

        for (final entry in banned.entries) {
          if (line.contains(entry.key)) {
            offences.add(
              '${entity.path}:${i + 1} contains "${entry.key}" '
              '— ${entry.value}\n    $trimmed',
            );
          }
        }
      }
    }

    expect(
      offences,
      isEmpty,
      reason:
          'The app must not sell, price, or direct the user to payment.\n'
          'Move the copy to site/ and leave Paywall.lockedLabel here.\n\n'
          '${offences.join('\n')}',
    );
  });
}
