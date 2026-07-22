/// Pulls stock recommendations out of a pasted chat message.
///
/// Pure Dart — no Flutter, no Hive — so every parsing rule below is a plain
/// unit test.
///
/// This is deliberately conservative. Chat messages are written by humans in
/// mixed Arabic and English with no fixed format, so the parser's job is to
/// produce a *draft* the user reviews and corrects, never to silently commit
/// numbers. Anything it cannot read confidently comes back incomplete and the
/// review screen makes the user fill it in.
library;

/// One recommendation read off a single line.
class ParsedRecommendation {
  final String? ticker;
  final double? entryPrice;
  final double? stopPrice;

  /// Present when the message named a target. Not stored on the watchlist —
  /// carried only so the review screen can show it as context.
  final double? targetPrice;

  /// The original line, so the user can see what it was read from.
  final String rawLine;

  const ParsedRecommendation({
    required this.rawLine,
    this.ticker,
    this.entryPrice,
    this.stopPrice,
    this.targetPrice,
  });

  /// Ready to save without further typing.
  bool get isComplete =>
      ticker != null &&
      entryPrice != null &&
      stopPrice != null &&
      entryPrice! > stopPrice!;

  /// Worth showing at all. A line with only a ticker is still useful — the
  /// user can type the prices — but a line with nothing recognisable is noise.
  bool get isUsable => ticker != null || entryPrice != null;

  ParsedRecommendation copyWith({
    String? ticker,
    double? entryPrice,
    double? stopPrice,
    double? targetPrice,
  }) => ParsedRecommendation(
    rawLine: rawLine,
    ticker: ticker ?? this.ticker,
    entryPrice: entryPrice ?? this.entryPrice,
    stopPrice: stopPrice ?? this.stopPrice,
    targetPrice: targetPrice ?? this.targetPrice,
  );
}

/// Uppercase Latin runs that are trading vocabulary, not tickers. Without this
/// list "STOP" and "BUY" would be read as ticker symbols.
const Set<String> _notTickers = {
  'STOP',
  'LOSS',
  'BUY',
  'SELL',
  'LONG',
  'SHORT',
  'ENTRY',
  'EXIT',
  'TARGET',
  'PRICE',
  'EGX',
  'TP',
  'SL',
  'THE',
  'AND',
  'FOR',
  'NEW',
  'HIGH',
  'LOW',
  'OPEN',
  'CLOSE',
};

const List<String> _entryWords = [
  'دخول',
  'الدخول',
  'شراء',
  'الشراء',
  'اشتري',
  'اشترى',
  'سعر',
  'السعر',
  'عند',
  'entry',
  'buy',
  'price',
];

const List<String> _stopWords = [
  'استوب',
  'الاستوب',
  'ستوب',
  'الستوب',
  'وقف',
  'الوقف',
  'خسارة',
  'stop',
  'sl',
];

const List<String> _targetWords = [
  'هدف',
  'الهدف',
  'اهداف',
  'أهداف',
  'target',
  'tp',
];

class _NumberHit {
  final double value;
  final int start;
  final int end;

  const _NumberHit(this.value, this.start, this.end);
}

class RecommendationParser {
  const RecommendationParser._();

  /// Reads a whole pasted message, one recommendation per line.
  ///
  /// Lines that yield nothing recognisable are dropped rather than returned as
  /// empty rows — a pasted message usually carries greetings and disclaimers
  /// around the actual picks.
  static List<ParsedRecommendation> parse(String message) {
    final results = <ParsedRecommendation>[];
    for (final rawLine in message.split(RegExp(r'[\r\n]+'))) {
      if (rawLine.trim().isEmpty) continue;
      final parsed = parseLine(rawLine);
      if (parsed.isUsable) results.add(parsed);
    }
    return results;
  }

  static ParsedRecommendation parseLine(String rawLine) {
    final line = normaliseDigits(rawLine);
    final lower = line.toLowerCase();

    final ticker = _findTicker(line);
    final numbers = _findNumbers(line);

    if (numbers.isEmpty) {
      return ParsedRecommendation(rawLine: rawLine, ticker: ticker);
    }

    final claimed = <int>{};
    final entry = _labelledValue(lower, numbers, _entryWords, claimed);
    final stop = _labelledValue(lower, numbers, _stopWords, claimed);
    final target = _labelledValue(lower, numbers, _targetWords, claimed);

    final leftovers = [
      for (var i = 0; i < numbers.length; i++)
        if (!claimed.contains(i)) numbers[i].value,
    ];

    var resolvedEntry = entry;
    var resolvedStop = stop;

    if (resolvedEntry == null && resolvedStop == null) {
      // Exactly two bare numbers is the common "COMI 10.50 9.80" shape. This
      // app is long-only, so the entry is necessarily the higher of the two —
      // which also makes the order they were written in irrelevant.
      if (leftovers.length == 2) {
        resolvedEntry = leftovers.reduce((a, b) => a > b ? a : b);
        resolvedStop = leftovers.reduce((a, b) => a < b ? a : b);
      } else if (leftovers.length == 1) {
        resolvedEntry = leftovers.first;
      }
      // Three or more unlabelled numbers is genuinely ambiguous — one of them
      // is probably a target. Guessing here would write a wrong stop into the
      // journal, so it is left incomplete for the user to resolve.
    } else if (resolvedEntry == null && leftovers.length == 1) {
      resolvedEntry = leftovers.first;
    } else if (resolvedStop == null && leftovers.length == 1) {
      final candidate = leftovers.first;
      // Only accept it as a stop if it is actually below the entry.
      if (resolvedEntry == null || candidate < resolvedEntry) {
        resolvedStop = candidate;
      }
    }

    return ParsedRecommendation(
      rawLine: rawLine,
      ticker: ticker,
      entryPrice: resolvedEntry,
      stopPrice: resolvedStop,
      targetPrice: target,
    );
  }

  /// The nearest number appearing *after* any of [words].
  ///
  /// Searching forward only matters: "وقف خسارة 9.80" puts the number after
  /// the label, and a backwards search would happily grab the entry price that
  /// preceded it.
  static double? _labelledValue(
    String lowerLine,
    List<_NumberHit> numbers,
    List<String> words,
    Set<int> claimed,
  ) {
    var best = -1;
    var bestDistance = 1 << 30;

    for (final word in words) {
      var from = 0;
      while (true) {
        final at = lowerLine.indexOf(word, from);
        if (at < 0) break;
        final labelEnd = at + word.length;
        for (var i = 0; i < numbers.length; i++) {
          if (claimed.contains(i)) continue;
          if (numbers[i].start < labelEnd) continue;
          final distance = numbers[i].start - labelEnd;
          // A number more than ~12 characters past the label almost certainly
          // belongs to the next clause, not this one.
          if (distance > 12) continue;
          if (distance < bestDistance) {
            bestDistance = distance;
            best = i;
          }
        }
        from = at + 1;
      }
    }

    if (best < 0) return null;
    claimed.add(best);
    return numbers[best].value;
  }

  static String? _findTicker(String line) {
    // EGX symbols are 3-6 Latin letters, sometimes with a .CA suffix.
    final matches = RegExp(r'\b([A-Za-z]{3,6})(?:\.[A-Za-z]{2})?\b')
        .allMatches(line);
    for (final match in matches) {
      final candidate = match.group(1)!.toUpperCase();
      if (_notTickers.contains(candidate)) continue;
      // Prefer a run the sender actually wrote in capitals; that is how
      // tickers are quoted, and it avoids picking up ordinary English words.
      if (match.group(1) == candidate) return candidate;
    }
    // Nothing was capitalised — fall back to the first non-vocabulary run.
    for (final match in matches) {
      final candidate = match.group(1)!.toUpperCase();
      if (!_notTickers.contains(candidate)) return candidate;
    }
    return null;
  }

  static List<_NumberHit> _findNumbers(String line) {
    return [
      for (final match in RegExp(r'\d+(?:\.\d+)?').allMatches(line))
        if (double.tryParse(match.group(0)!) case final value?)
          _NumberHit(value, match.start, match.end),
    ];
  }

  /// Converts Arabic-Indic and Persian digits to ASCII, and Arabic decimal and
  /// thousands separators to their Latin equivalents.
  ///
  /// Without this, `double.tryParse` rejects every number in a message typed on
  /// an Arabic keyboard and the whole paste comes back empty.
  static String normaliseDigits(String input) {
    const arabicIndicZero = 0x0660; // ٠
    const persianZero = 0x06F0; // ۰
    final buffer = StringBuffer();

    for (final rune in input.runes) {
      if (rune >= arabicIndicZero && rune <= arabicIndicZero + 9) {
        buffer.write(rune - arabicIndicZero);
      } else if (rune >= persianZero && rune <= persianZero + 9) {
        buffer.write(rune - persianZero);
      } else if (rune == 0x066B) {
        buffer.write('.'); // ٫ decimal separator
      } else if (rune == 0x066C) {
        buffer.write(''); // ٬ thousands separator
      } else if (rune == 0x060C) {
        buffer.write(' '); // ، so "10،9" does not read as one number
      } else {
        buffer.writeCharCode(rune);
      }
    }
    return buffer.toString();
  }
}
