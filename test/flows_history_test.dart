import 'package:egx_trade_journal/core/calc/flows_history.dart';
import 'package:flutter_test/flutter_test.dart';

/// The cases that matter are the ones about HOLES. This data comes from a
/// source behind bot defence and a collection run can simply fail, so a
/// missing session is ordinary rather than exceptional — and the difference
/// between "the run stops here" and "the total skips this day" is the whole
/// design.
void main() {
  group('the current run', () {
    test('counts consecutive sessions on the same side', () {
      final run = flowRun([5, 4, 3, -1, 2])!;
      expect(run.runLength, 3);
      expect(run.runBuying, isTrue);
    });

    test('reads a selling run just the same', () {
      final run = flowRun([-5, -4, 1])!;
      expect(run.runLength, 2);
      expect(run.runBuying, isFalse);
    });

    test('a single session is a run of one, and not a streak', () {
      final run = flowRun([5, -1, -2])!;
      expect(run.runLength, 1);
      expect(run.hasRun, isFalse);
    });

    test('two is the shortest thing called a streak', () {
      expect(flowRun([5, 4, -1])!.hasRun, isTrue);
    });

    test('a gap ENDS the run — we cannot claim a session nobody read', () {
      final run = flowRun([5, 4, null, 3, 2])!;
      expect(run.runLength, 2);
    });

    test('a flat session ends the run, because flat is neither side', () {
      expect(flowRun([5, 4, 0, 3])!.runLength, 2);
    });

    test('a flat NEWEST session is a run of zero, not a missing window', () {
      final run = flowRun([0, 4, 3])!;
      expect(run.runLength, 0);
      expect(run.runBuying, isNull);
      // Still readable: the total covers all three.
      expect(run.sessions, 3);
    });

    test('a missing newest session is also a run of zero', () {
      final run = flowRun([null, 4, 3])!;
      expect(run.runLength, 0);
      expect(run.runBuying, isNull);
      expect(run.sessions, 2);
    });

    test('the whole window on one side is one long run', () {
      expect(flowRun([1, 2, 3, 4, 5])!.runLength, 5);
    });
  });

  group('the total', () {
    test('sums every readable session', () {
      final run = flowRun([10, -4, 6])!;
      expect(run.total, 12);
      expect(run.sessions, 3);
    });

    test('SKIPS a gap rather than ending, and says how many it counted', () {
      final run = flowRun([10, null, 6, null])!;
      expect(run.total, 16);
      // The denominator is published so «+16 على جلستين» is checkable.
      expect(run.sessions, 2);
    });

    test('counts a flat session — it happened, it was just zero', () {
      final run = flowRun([10, 0, 6])!;
      expect(run.sessions, 3);
      expect(run.total, 16);
    });

    test('a total can be negative while the current run is buying', () {
      // Exactly the case a row-by-row table hides: today turned, the month did
      // not.
      final run = flowRun([5, 4, -100])!;
      expect(run.runBuying, isTrue);
      expect(run.runLength, 2);
      expect(run.total, -91);
    });
  });

  group('nothing readable', () {
    test('an empty window is null, not a zero', () {
      expect(flowRun([]), isNull);
    });

    test('a window of nothing but gaps is null', () {
      expect(flowRun([null, null]), isNull);
    });

    test('NaN and infinity are treated as gaps, never as figures', () {
      // A sum that silently becomes NaN would render as «NaN ج.م» on a screen
      // whose whole claim is that the numbers are the exchange's.
      expect(flowRun([double.nan, double.infinity]), isNull);
      final run = flowRun([5, double.nan, 4])!;
      expect(run.runLength, 1);
      expect(run.total, 9);
      expect(run.sessions, 2);
    });
  });
}
