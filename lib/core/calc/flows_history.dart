/// Reading a run of EGX sessions, rather than listing them.
///
/// PURE — no Flutter, no Firestore, no models. It takes a list of net figures
/// and returns the two things a row-by-row table cannot say: which side the
/// money has been on lately, and how much of it there was.
///
/// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
///
/// Both surfaces already show the same thing: the latest session in three
/// cards, and under it a table of the last thirty as signed numbers. That is a
/// spreadsheet. «الأجانب صافي شراء ٥ جلسات على التوالي» is the sentence the
/// product's own pitch promises, and no reader is going to derive it by
/// scanning thirty rows of عربي-formatted millions.
///
/// ── AND WHY IT IS HERE AND NOT WRITTEN TWICE ────────────────────────────────
///
/// `lib/core/calc/` compiles to JavaScript (CLAUDE.md §24), so the website runs
/// THIS SOURCE rather than a mirror of it — the app and the browser cannot
/// disagree about how long a streak is. That mattered enough to be worth the
/// bridge: the alternative is the same rule in Dart and TypeScript, which is
/// the arrangement §5 spends a page warning about.
///
/// The alerts worker has its own `flow_flip` in Python and that is NOT a
/// duplicate of this. It answers a different question — "is this worth waking
/// somebody up for", with a minimum run length and a dedupe key — where this
/// one answers "what does the last month look like". They share an input shape
/// and nothing else.
library;

/// What a window of sessions says about one nationality.
class FlowRun {
  /// Consecutive sessions, counting back from the newest, on the same side.
  ///
  /// Zero when the newest session is missing or exactly flat, which is not the
  /// same as "no data" — see [sessions].
  final int runLength;

  /// The side of that run. Null exactly when [runLength] is zero.
  final bool? runBuying;

  /// Net across every readable session in the window, gaps skipped.
  final double total;

  /// How many sessions [total] is made of.
  ///
  /// PUBLISHED ALONGSIDE THE TOTAL ON PURPOSE. A sum over an unknown number of
  /// sessions is not a figure anybody can use, and this data has real holes in
  /// it — the exchange sits behind bot defence and a collection run can fail.
  /// «+٢١٠ مليون على ٢٧ جلسة» is checkable; «+٢١٠ مليون» is not.
  final int sessions;

  const FlowRun({
    required this.runLength,
    required this.runBuying,
    required this.total,
    required this.sessions,
  });

  /// True when the run is long enough to be worth a sentence.
  ///
  /// One session is not a streak — it is today. Two is the shortest thing that
  /// can be called a run without the word doing more work than the data.
  bool get hasRun => runLength >= 2;
}

/// Reads one nationality's window. [netsNewestFirst] may contain nulls.
///
/// Returns null only when there is nothing readable at all, so a caller can
/// distinguish "no sessions yet" from "a flat session today".
///
/// ── A GAP ENDS THE RUN BUT DOES NOT END THE TOTAL, AND THAT IS DELIBERATE ──
///
/// They are different claims. "Five sessions running" asserts something about
/// every one of those five, so a session nobody could read makes the assertion
/// unsafe — the run stops there. A total is a sum of what is known, and
/// skipping a missing day understates it rather than inventing anything;
/// [sessions] then says how many days it covers so the reader can see the hole.
///
/// A zero ends the run for the same reason it does in the alerts worker: flat
/// is neither side, and counting it as a continuation would let a run of buying
/// survive a day on which nobody bought.
FlowRun? flowRun(List<double?> netsNewestFirst) {
  var total = 0.0;
  var sessions = 0;
  for (final net in netsNewestFirst) {
    if (net == null || net.isNaN || net.isInfinite) continue;
    total += net;
    sessions += 1;
  }
  if (sessions == 0) return null;

  final head = netsNewestFirst.isEmpty ? null : netsNewestFirst.first;
  if (head == null || head.isNaN || head.isInfinite || head == 0) {
    return FlowRun(
      runLength: 0,
      runBuying: null,
      total: total,
      sessions: sessions,
    );
  }

  final buying = head > 0;
  var runLength = 1;
  for (final net in netsNewestFirst.skip(1)) {
    if (net == null || net.isNaN || net.isInfinite || net == 0) break;
    if ((net > 0) != buying) break;
    runLength += 1;
  }

  return FlowRun(
    runLength: runLength,
    runBuying: buying,
    total: total,
    sessions: sessions,
  );
}
