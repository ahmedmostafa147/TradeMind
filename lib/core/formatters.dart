import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
// intl exports its own bidi TextDirection class, which shadows the dart:ui enum
// that NumericText below needs. Hidden rather than prefixed so the formatter
// call sites stay readable.
import 'package:intl/intl.dart' hide TextDirection;

/// Shown wherever a value is unavailable — an open trade's R, a stat over an
/// empty journal. Never render a 0 in place of this.
const String kEmptyValue = '—';

const String kCurrencySuffix = 'ج.م';

/// Every formatter below is built against locale 'en' ON PURPOSE, even though
/// the app's UI locale is 'ar'.
///
/// intl's 'ar' locale sets ZERO_DIGIT to ٠ (U+0660) and offsets every digit
/// from it, so NumberFormat('#,##0.00', 'ar').format(6800) yields ٦٬٨٠٠٫٠٠.
/// Switching to 'ar_EG' does NOT help — CLDR assigns Egypt the 'arab'
/// numbering system too. The spec requires Western digits, and the
/// number-formatting locale is independent of the UI locale, so 'en' it is.
/// The Arabic currency suffix is appended as a plain literal.
final NumberFormat _money = NumberFormat('#,##0.00', 'en');
final NumberFormat _oneDecimal = NumberFormat('0.0', 'en');
final NumberFormat _integer = NumberFormat('#,##0', 'en');

/// "6,800.00 ج.م"
String money(double? value) =>
    value == null ? kEmptyValue : '${_money.format(value)} $kCurrencySuffix';

/// What a capital of 0 is called on screen.
///
/// 0 is [Settings.defaultCapital] and it means UNSET, so [money] would print
/// «0.00 ج.م» — a figure the user never typed, next to numbers derived from
/// it. Mirrored in site/lib/format.ts as `UNSET_CAPITAL`; the two must say the
/// same words, since the same account sees both.
const String kUnsetCapital = 'لسه محددش';

/// "28,000.00 ج.م", or «لسه محددش» while there is no capital.
String capitalLabel(double? capital) =>
    (capital == null || !capital.isFinite || capital <= 0)
    ? kUnsetCapital
    : money(capital);

/// "+816.00 ج.م" / "-272.00 ج.م" — for P&L, where the sign carries meaning.
String signedMoney(double? value) {
  if (value == null) return kEmptyValue;
  final sign = value > 0 ? '+' : '';
  return '$sign${_money.format(value)} $kCurrencySuffix';
}

/// Takes a FRACTION and renders a percent: 0.12 -> "12.0%".
String percent(double? fraction) =>
    fraction == null ? kEmptyValue : '${_oneDecimal.format(fraction * 100)}%';

/// "2.4R"
String rMultiple(double? r) =>
    r == null ? kEmptyValue : '${_oneDecimal.format(r)}R';

String quantity(int? value) =>
    value == null ? kEmptyValue : _integer.format(value);

/// "2026/03/05"
///
/// Built by hand rather than with DateFormat on purpose. DateFormat with an
/// explicit locale requires initializeDateFormatting() to have been awaited,
/// and DateFormat without one follows Intl.defaultLocale — which would emit
/// Arabic-Indic digits the moment anything sets it to 'ar'. The pattern here is
/// entirely numeric, so locale data contributes nothing, and int.toString()
/// always yields ASCII digits.
String dateLabel(DateTime? value) {
  if (value == null) return kEmptyValue;
  final year = value.year.toString().padLeft(4, '0');
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  return '$year/$month/$day';
}

/// Indexed by DateTime.weekday, so index 1 is Monday and index 7 is Sunday.
/// Index 0 is unused padding.
const List<String> _weekdayNames = [
  '',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
  'الأحد',
];

/// Indexed by DateTime.month, so index 1 is January. Index 0 is unused.
const List<String> _monthNames = [
  '',
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

String weekdayName(int? weekday) =>
    (weekday == null || weekday < 1 || weekday > 7)
    ? kEmptyValue
    : _weekdayNames[weekday];

String monthName(int? month) => (month == null || month < 1 || month > 12)
    ? kEmptyValue
    : _monthNames[month];

/// "مارس 2026" — for period buckets on the analytics screen.
String monthYearLabel(DateTime? date) =>
    date == null ? kEmptyValue : '${monthName(date.month)} ${date.year}';

/// Safety net for strings produced by locale-aware widgets we do not control
/// (the Material date picker header, for instance), which can still emit
/// Arabic-Indic digits. Applied at those specific call sites only — not
/// blanket-applied, since it would be a no-op cost everywhere else.
String toWesternDigits(String input) {
  const arabicIndicZero = 0x0660;
  final buffer = StringBuffer();
  for (final rune in input.runes) {
    if (rune >= arabicIndicZero && rune <= arabicIndicZero + 9) {
      buffer.write(rune - arabicIndicZero);
    } else {
      buffer.writeCharCode(rune);
    }
  }
  return buffer.toString();
}

/// Parses user input that may contain Arabic-Indic digits.
///
/// Arabic keyboards emit ٠-٩, and double.parse throws on those. Every numeric
/// field goes through this rather than double.tryParse directly.
double? parseNumber(String? input) {
  if (input == null) return null;
  final normalised = toWesternDigits(input).replaceAll(',', '').trim();
  if (normalised.isEmpty) return null;
  return double.tryParse(normalised);
}

int? parseInteger(String? input) {
  if (input == null) return null;
  final normalised = toWesternDigits(input).replaceAll(',', '').trim();
  if (normalised.isEmpty) return null;
  return int.tryParse(normalised);
}

class ThousandsFormatter extends TextInputFormatter {
  const ThousandsFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) return newValue;
    final text = toWesternDigits(newValue.text).replaceAll(',', '').trim();
    if (text.isEmpty) return newValue;

    final parts = text.split('.');
    if (parts.length > 2) return oldValue;

    final integerPart = parts[0];
    if (integerPart.isNotEmpty && !RegExp(r'^\d+$').hasMatch(integerPart)) {
      return oldValue;
    }

    final formattedInteger = integerPart.replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );

    final newText = parts.length == 2
        ? '$formattedInteger.${parts[1]}'
        : formattedInteger;

    return TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: newText.length),
    );
  }
}

/// Renders a number inside an RTL paragraph without the sign flipping sides.
///
/// In an RTL run, "-272.00 ج.م" puts the minus on the visually wrong end of the
/// number. Forcing the numeric portion to LTR fixes it while letting the
/// Arabic suffix flow naturally.
class NumericText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;

  const NumericText(this.text, {super.key, this.style, this.textAlign});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: style,
      textAlign: textAlign,
      textDirection: TextDirection.ltr,
    );
  }
}
