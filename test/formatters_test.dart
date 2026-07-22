import 'package:egx_trade_journal/core/formatters.dart';
import 'package:flutter_test/flutter_test.dart';

/// The spec requires Western digits everywhere. This is the assertion that
/// actually enforces it — a formatter accidentally built against locale 'ar'
/// would still produce a plausible-looking string, just in ٠١٢٣.
Matcher get hasNoArabicIndicDigits => predicate<String>(
  (s) => !s.runes.any((r) => r >= 0x0660 && r <= 0x0669),
  'contains no Arabic-Indic digits',
);

void main() {
  group('money', () {
    test('formats with thousands separator and Arabic currency suffix', () {
      expect(money(6800.0), '6,800.00 ج.م');
      expect(money(17000.0), '17,000.00 ج.م');
      expect(money(340.0), '340.00 ج.م');
    });

    test('rounds the spec fixture P&L to 816.00', () {
      // The raw double is 815.9999999999995; the spec's "816.00" is a
      // display-rounding claim, and this is where it is made true.
      expect(money(815.9999999999995), '816.00 ج.م');
    });

    test('uses Western digits', () {
      expect(money(6800.0), hasNoArabicIndicDigits);
    });

    test('null renders as the empty marker', () {
      expect(money(null), '—');
    });
  });

  group('signedMoney', () {
    test('positive carries an explicit plus', () {
      expect(signedMoney(816.0), '+816.00 ج.م');
    });

    test('negative carries its own minus', () {
      expect(signedMoney(-272.0), '-272.00 ج.م');
    });

    test('zero is unsigned', () {
      expect(signedMoney(0), '0.00 ج.م');
    });

    test('null renders as the empty marker', () {
      expect(signedMoney(null), '—');
    });
  });

  group('percent', () {
    test('converts a fraction to one-decimal percent', () {
      expect(percent(0.12), '12.0%');
      expect(percent(0.02), '2.0%');
      expect(percent(2 / 3), '66.7%');
    });

    test('null renders as the empty marker', () {
      expect(percent(null), '—');
    });

    test('uses Western digits', () {
      expect(percent(0.12), hasNoArabicIndicDigits);
    });
  });

  group('rMultiple', () {
    test('formats with the R suffix', () {
      expect(rMultiple(2.4), '2.4R');
      expect(rMultiple(-0.8), '-0.8R');
    });

    test('rounds the spec fixture R to 2.4R', () {
      // Raw value is 2.3999999999999986.
      expect(rMultiple(2.3999999999999986), '2.4R');
    });

    test('null renders as the empty marker', () {
      expect(rMultiple(null), '—');
    });
  });

  group('quantity and dates', () {
    test('quantity groups thousands', () {
      expect(quantity(680), '680');
      expect(quantity(12500), '12,500');
      expect(quantity(null), '—');
    });

    test('dates are yyyy/MM/dd in Western digits', () {
      final formatted = dateLabel(DateTime(2026, 3, 5));
      expect(formatted, '2026/03/05');
      expect(formatted, hasNoArabicIndicDigits);
      expect(dateLabel(null), '—');
    });
  });

  group('Arabic weekday and month names', () {
    test('weekdays follow DateTime.weekday, Monday = 1', () {
      expect(weekdayName(DateTime.monday), 'الاثنين');
      expect(weekdayName(DateTime.sunday), 'الأحد');
      expect(weekdayName(DateTime.saturday), 'السبت');
    });

    test('months follow DateTime.month, January = 1', () {
      expect(monthName(1), 'يناير');
      expect(monthName(3), 'مارس');
      expect(monthName(12), 'ديسمبر');
    });

    test('out-of-range and null render as the empty marker', () {
      expect(weekdayName(null), '—');
      expect(weekdayName(0), '—');
      expect(weekdayName(8), '—');
      expect(monthName(null), '—');
      expect(monthName(0), '—');
      expect(monthName(13), '—');
    });

    test('month-year labels use Western digits for the year', () {
      final label = monthYearLabel(DateTime(2026, 3));
      expect(label, 'مارس 2026');
      expect(label, hasNoArabicIndicDigits);
      expect(monthYearLabel(null), '—');
    });
  });

  group('toWesternDigits', () {
    test('converts Arabic-Indic digits', () {
      expect(toWesternDigits('١٢٣٤'), '1234');
      expect(toWesternDigits('٠'), '0');
    });

    test('leaves everything else untouched', () {
      expect(toWesternDigits('abc'), 'abc');
      expect(toWesternDigits('10.50'), '10.50');
      expect(toWesternDigits('سعر ١٠'), 'سعر 10');
    });
  });

  group('parsing user input', () {
    test('parses Western input', () {
      expect(parseNumber('10.50'), 10.5);
      expect(parseInteger('680'), 680);
    });

    test('parses Arabic-Indic input, which double.parse would reject', () {
      expect(parseNumber('١٠.٥٠'), 10.5);
      expect(parseInteger('٦٨٠'), 680);
    });

    test('empty, whitespace and garbage return null rather than throwing', () {
      expect(parseNumber(''), isNull);
      expect(parseNumber('   '), isNull);
      expect(parseNumber('abc'), isNull);
      expect(parseNumber(null), isNull);
      expect(parseInteger('12.5'), isNull);
    });

    test('trims surrounding whitespace', () {
      expect(parseNumber('  10.50  '), 10.5);
    });
  });
}
