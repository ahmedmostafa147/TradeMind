import 'package:egx_trade_journal/watchlist/recommendation_parser.dart';
import 'package:flutter_test/flutter_test.dart';

ParsedRecommendation line(String text) =>
    RecommendationParser.parseLine(text);

void main() {
  group('digit normalisation', () {
    test('converts Arabic-Indic digits', () {
      expect(RecommendationParser.normaliseDigits('١٠.٥٠'), '10.50');
      expect(RecommendationParser.normaliseDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
    });

    test('converts Persian digits', () {
      expect(RecommendationParser.normaliseDigits('۱۲۳'), '123');
    });

    test('converts the Arabic decimal separator', () {
      expect(RecommendationParser.normaliseDigits('١٠٫٥'), '10.5');
    });

    test('strips the Arabic thousands separator', () {
      expect(RecommendationParser.normaliseDigits('١٬٠٠٠'), '1000');
    });

    test('an Arabic comma becomes a space, not a decimal point', () {
      // Otherwise "10،9" would parse as the single number 10.9.
      expect(RecommendationParser.normaliseDigits('10،9'), '10 9');
    });

    test('leaves Latin text and ASCII digits untouched', () {
      expect(RecommendationParser.normaliseDigits('COMI 10.50'), 'COMI 10.50');
    });
  });

  group('the plain shape: ticker then two numbers', () {
    test('reads ticker, entry and stop', () {
      final r = line('COMI 10.50 9.80');
      expect(r.ticker, 'COMI');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, 9.80);
      expect(r.isComplete, isTrue);
    });

    // Long-only, so the entry is necessarily the higher number — which makes
    // the order the sender wrote them in irrelevant.
    test('order of the two numbers does not matter', () {
      final r = line('COMI 9.80 10.50');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, 9.80);
    });

    test('works with Arabic-Indic digits', () {
      final r = line('COMI ١٠.٥٠ ٩.٨٠');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, 9.80);
    });
  });

  group('labelled Arabic messages', () {
    test('دخول and استوب', () {
      final r = line('COMI دخول 10.50 استوب 9.80');
      expect(r.ticker, 'COMI');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, 9.80);
      expect(r.isComplete, isTrue);
    });

    test('شراء and وقف خسارة', () {
      final r = line('سهم HRHO شراء من 18.40 وقف خسارة 17.90');
      expect(r.ticker, 'HRHO');
      expect(r.entryPrice, 18.40);
      expect(r.stopPrice, 17.90);
    });

    test('a target is captured separately and never mistaken for the stop', () {
      final r = line('COMI دخول 10.50 استوب 9.80 هدف 12.00');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, 9.80);
      expect(r.targetPrice, 12.00);
      expect(r.isComplete, isTrue);
    });

    test('labels win even when the stop is written first', () {
      final r = line('SWDY استوب 4.50 دخول 5.20');
      expect(r.entryPrice, 5.20);
      expect(r.stopPrice, 4.50);
    });

    test('English labels work too', () {
      final r = line('ETEL buy 30.00 stop 28.50 target 35');
      expect(r.entryPrice, 30.00);
      expect(r.stopPrice, 28.50);
      expect(r.targetPrice, 35.0);
    });

    test('a full Arabic sentence with digits in words', () {
      final r = line('ننصح بشراء سهم TMGH عند سعر ٩.٧٥ والاستوب ٩.٢٠');
      expect(r.ticker, 'TMGH');
      expect(r.entryPrice, 9.75);
      expect(r.stopPrice, 9.20);
    });
  });

  group('ambiguity is reported, never guessed', () {
    // The critical rule: three bare numbers could be entry/stop/target in any
    // order. Guessing would write a wrong stop into the journal.
    test('three unlabelled numbers leaves the stop unset', () {
      final r = line('COMI 10.50 9.80 12.00');
      expect(r.ticker, 'COMI');
      expect(r.entryPrice, isNull);
      expect(r.stopPrice, isNull);
      expect(r.isComplete, isFalse);
      expect(r.isUsable, isTrue, reason: 'the ticker is still worth keeping');
    });

    test('one bare number fills only the entry', () {
      final r = line('COMI 10.50');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, isNull);
      expect(r.isComplete, isFalse);
    });

    test('a labelled entry plus one bare number below it becomes the stop', () {
      final r = line('COMI دخول 10.50 9.80');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, 9.80);
    });

    test('a bare number above the entry is not accepted as a stop', () {
      // Almost certainly a target written without its label.
      final r = line('COMI دخول 10.50 12.00');
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, isNull);
      expect(r.isComplete, isFalse);
    });

    test('a stop above the entry is not treated as complete', () {
      final r = line('COMI دخول 9.00 استوب 10.00');
      expect(r.entryPrice, 9.00);
      expect(r.stopPrice, 10.00);
      expect(
        r.isComplete,
        isFalse,
        reason: 'long-only: a stop above entry is nonsense',
      );
    });
  });

  group('ticker detection', () {
    test('trading vocabulary is not read as a ticker', () {
      expect(line('BUY 10.50 STOP 9.80').ticker, isNull);
      expect(line('TARGET 12').ticker, isNull);
    });

    test('a .CA suffix is stripped', () {
      expect(line('COMI.CA 10.50 9.80').ticker, 'COMI');
    });

    test('prefers the capitalised run over ordinary words', () {
      final r = line('the best pick today is COMI at 10.50 stop 9.80');
      expect(r.ticker, 'COMI');
    });

    test('a line with no ticker still yields prices', () {
      final r = line('دخول 10.50 استوب 9.80');
      expect(r.ticker, isNull);
      expect(r.entryPrice, 10.50);
      expect(r.stopPrice, 9.80);
      expect(r.isUsable, isTrue);
      expect(r.isComplete, isFalse, reason: 'a ticker is required to save');
    });
  });

  group('whole messages', () {
    test('reads one recommendation per line', () {
      final results = RecommendationParser.parse('''
COMI دخول 10.50 استوب 9.80
HRHO دخول 18.40 استوب 17.90
SWDY 5.20 4.80
''');
      expect(results, hasLength(3));
      expect(results.map((r) => r.ticker), ['COMI', 'HRHO', 'SWDY']);
      expect(results.every((r) => r.isComplete), isTrue);
    });

    test('drops greetings and disclaimers', () {
      final results = RecommendationParser.parse('''
السلام عليكم
ترشيحات النهاردة:
COMI دخول 10.50 استوب 9.80
مع تحياتي
إخلاء مسؤولية: القرار قرارك
''');
      expect(results, hasLength(1));
      expect(results.single.ticker, 'COMI');
    });

    test('keeps a partial line so the user can complete it', () {
      final results = RecommendationParser.parse('''
COMI دخول 10.50 استوب 9.80
HRHO
''');
      expect(results, hasLength(2));
      expect(results[1].ticker, 'HRHO');
      expect(results[1].isComplete, isFalse);
    });

    test('an empty or meaningless message yields nothing', () {
      expect(RecommendationParser.parse(''), isEmpty);
      expect(RecommendationParser.parse('   \n\n  '), isEmpty);
      expect(RecommendationParser.parse('السلام عليكم ورحمة الله'), isEmpty);
    });

    test('handles Windows line endings', () {
      final results = RecommendationParser.parse(
        'COMI 10.50 9.80\r\nHRHO 18.40 17.90',
      );
      expect(results, hasLength(2));
    });

    test('a realistic mixed message', () {
      final results = RecommendationParser.parse('''
توصيات اليوم ٢١/٧
1- سهم COMI شراء من ١٠.٥٠ وقف خسارة ٩.٨٠ هدف ١٢
2- سهم HRHO دخول 18.40 استوب 17.90
3- ETEL buy 30 stop 28.5
بالتوفيق للجميع
''');
      // The numbered prefixes ("1-") are digits too, so this also proves the
      // labelled search does not grab them.
      final complete = results.where((r) => r.isComplete).toList();
      expect(complete, hasLength(3));
      expect(complete[0].ticker, 'COMI');
      expect(complete[0].entryPrice, 10.50);
      expect(complete[0].stopPrice, 9.80);
      expect(complete[1].ticker, 'HRHO');
      expect(complete[1].entryPrice, 18.40);
      expect(complete[2].ticker, 'ETEL');
      expect(complete[2].stopPrice, 28.5);
    });
  });

  test('copyWith lets the review screen fix a field', () {
    final original = line('COMI 10.50');
    final fixed = original.copyWith(stopPrice: 9.80);
    expect(fixed.ticker, 'COMI');
    expect(fixed.entryPrice, 10.50);
    expect(fixed.stopPrice, 9.80);
    expect(fixed.isComplete, isTrue);
    expect(fixed.rawLine, original.rawLine);
  });
}
