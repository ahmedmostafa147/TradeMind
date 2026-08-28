import 'package:egx_trade_journal/settings/settings.dart';
import 'package:egx_trade_journal/shell/home_shell.dart';
import 'package:egx_trade_journal/trades/widgets/quick_add_trade_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/app_harness.dart';

/// An account with NO capital set — the state every new account starts in.
///
/// [Settings.defaultCapital] used to be 17,000: a number nobody chose, which
/// then sized every position, decided every over-risk verdict and fed the
/// discipline score for anyone who never opened the settings screen. It is 0
/// now, and 0 means «لسه محددش» rather than «صفر جنيه».
///
/// That only works if the interface SAYS so. Every calculation already answers
/// null for a capital of 0 — `safeDiv` returns null, `maxLossPerTrade` returns
/// 0 — so the failure mode this file guards is not a wrong number. It is a
/// screen that quietly shows nothing where a suggestion belongs, which reads
/// as a broken app rather than as a setting waiting to be filled in.
///
/// The harness seeds 17,000 by default for the rest of the suite, which is why
/// every test here passes `capital: 0` explicitly.
void main() {
  late AppHarness app;

  setUp(() async {
    app = await AppHarness.create(capital: 0);
  });

  tearDown(() => app.dispose());

  /// «الإعدادات» is a gear in each screen's AppBar, not a bottom-bar
  /// destination. `.hitTestable()` because the shell's IndexedStack builds
  /// every screen, so several gears exist and only one is on screen.
  Future<void> openSettings(WidgetTester tester) async {
    await tester.tap(find.byKey(settingsActionKey).hitTestable().first);
    await tester.pumpAndSettle();
  }

  test('the app default is unset, not a figure', () {
    expect(Settings.defaultCapital, 0);
    expect(const Settings().hasCapital, isFalse);
    expect(const Settings(capital: 1).hasCapital, isTrue);
  });

  testWidgets('an untouched account reads as unset, not as zero', (
    tester,
  ) async {
    await app.pumpApp(tester);

    await openSettings(tester);

    // The box is EMPTY, not "0.00": a zero in a field reads as a value the
    // user chose, and leaves the hint nothing to explain.
    final capitalField = tester.widget<TextField>(
      find.ancestor(
        of: find.text('رأس المال'),
        matching: find.byType(TextField),
      ),
    );
    expect(capitalField.controller?.text, isEmpty);

    // And the loss budget says «—» rather than «0.00 ج.م», which would read as
    // a rule that permits no trade at all.
    expect(find.text('أقصى خسارة لو ضرب الاستوب'), findsOneWidget);
    expect(find.text('0.00 ج.م'), findsNothing);
  });

  testWidgets('the sizing suggestion says why it is missing', (tester) async {
    await app.pump(
      tester,
      const Scaffold(body: SingleChildScrollView(child: QuickAddTradeSheet())),
    );

    await tester.enterText(find.byType(TextFormField).first, 'COMI');
    await tester.enterText(
      find.ancestor(
        of: find.text('سعر الدخول'),
        matching: find.byType(TextField),
      ),
      '10',
    );
    await tester.enterText(
      find.ancestor(
        of: find.text('وقف الخسارة'),
        matching: find.byType(TextField),
      ),
      '9.50',
    );
    await tester.pumpAndSettle();

    // With a capital there would be a «المقترح: …» helper here. Without one
    // the helper names the missing setting instead of disappearing.
    expect(find.textContaining('المقترح'), findsNothing);
    expect(
      find.text('حدّد رأس مالك في الإعدادات عشان يطلع مقترح'),
      findsOneWidget,
    );
  });

  testWidgets('a capital typed on this screen reaches the account', (
    tester,
  ) async {
    await app.pumpApp(tester);
    await openSettings(tester);

    await tester.enterText(
      find.ancestor(
        of: find.text('رأس المال'),
        matching: find.byType(TextField),
      ),
      '50000',
    );
    await tester.pumpAndSettle();

    // The whole point of the unset state is that it ENDS. 50,000 at the
    // default 2% is a 1,000 loss budget.
    expect(find.text('1,000.00 ج.م'), findsOneWidget);
    expect((await app.storedSettings()).capital, 50000);
  });
}
