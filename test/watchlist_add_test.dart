import 'package:egx_trade_journal/shell/trades_hub_screen.dart';
import 'package:egx_trade_journal/watchlist/widgets/watchlist_view.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/app_harness.dart';

/// A watch can be CREATED on the phone.
///
/// `WatchlistFormScreen` has always had an add mode. Nothing ever opened it in
/// that mode: the hub's overflow menu — the documented route — was removed, and
/// the only remaining caller was the «تعديل» button on an existing card. So the
/// feature could be used on the phone by everyone except someone who had not
/// already used it on the web.
///
/// This is a REACHABILITY test, not a form test. It asserts that a person
/// starting from the hub with an empty watchlist can get to a blank form.
void main() {
  late AppHarness app;

  setUp(() async {
    app = await AppHarness.create();
  });

  tearDown(() => app.dispose());

  /// The harness keeps the quote badge and the market board offline, so the
  /// open-position cards and the ticker badge never reach for the network and
  /// the tree settles.
  Future<void> pumpHub(WidgetTester tester) =>
      app.pump(tester, const TradesHubScreen());

  testWidgets('an empty watchlist offers a way to fill it', (tester) async {
    await pumpHub(tester);

    await tester.tap(find.text('قائمة المراقبة'));
    await tester.pumpAndSettle();

    expect(
      find.text(WatchlistView.addLabel),
      findsOneWidget,
      reason: 'the empty state must say what to do, not just that it is empty',
    );
  });

  testWidgets('that way lands on a BLANK form, not an edit', (tester) async {
    await pumpHub(tester);

    await tester.tap(find.text('قائمة المراقبة'));
    await tester.pumpAndSettle();
    await tester.tap(find.text(WatchlistView.addLabel));
    await tester.pumpAndSettle();

    // The form titles itself by mode. «تعديل المتابعة» here would mean it was
    // handed an `existing`, which is the bug this exists to catch.
    expect(find.text('إضافة للمتابعة'), findsOneWidget);
    expect(find.text('تعديل المتابعة'), findsNothing);
  });
}
