import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:egx_trade_journal/core/preferences/device_preferences.dart';
import 'package:egx_trade_journal/settings/cubit/settings_cubit.dart';
import 'package:egx_trade_journal/settings/data/settings_repository.dart';
import 'package:egx_trade_journal/settings/settings.dart';

void main() {
  late FakeFirebaseFirestore db;
  late SettingsRepository repo;
  late DevicePreferences device;
  late SettingsCubit cubit;

  const uid = 'user-1';

  Future<void> seed(Map<String, Object?> data) => db
      .collection('users')
      .doc(uid)
      .collection('settings')
      .doc('risk')
      .set(data);

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    db = FakeFirebaseFirestore();
    repo = SettingsRepository(db);
    device = await DevicePreferences.open();
    cubit = SettingsCubit(repo, device);
  });

  tearDown(() => cubit.close());

  Future<SettingsState> settled() =>
      cubit.stream.firstWhere((s) => s is! SettingsLoading);

  group('the loading state protects arithmetic', () {
    test('settings is null until the account document is read', () {
      // This is the point of the class. Capital divides into every position
      // size and every risk percentage in the product, so handing out
      // `const Settings()` while the real values are in flight would not show
      // nothing — it would show a confident wrong number in the one place the
      // user is trusting the app to be right.
      expect(cubit.state, isA<SettingsLoading>());
      expect(cubit.settings, isNull);
    });

    test('signed out yields no settings at all, not defaults', () async {
      await cubit.followAccount(null);

      expect(cubit.state, isA<SettingsSignedOut>());
      expect(cubit.settings, isNull);
    });
  });

  group('reading', () {
    test('an account with no document falls back to the class defaults', () async {
      await cubit.followAccount(uid);
      await settled();

      expect(cubit.settings!.capital, Settings.defaultCapital);
      expect(cubit.settings!.maxRiskPercent, Settings.defaultMaxRiskPercent);
    });

    test('a stored rule is read', () async {
      await seed({
        'capital': 250000.0,
        'maxRiskPercent': 0.015,
        'waitingThresholdDays': 14,
        'defaultTakeProfitPercent': 0.08,
        'defaultStopLossPercent': 0.03,
      });

      await cubit.followAccount(uid);
      await settled();

      final s = cubit.settings!;
      expect(s.capital, 250000.0);
      expect(s.maxRiskPercent, 0.015);
      expect(s.waitingThresholdDays, 14);
      expect(s.defaultTakeProfitPercent, 0.08);
      expect(s.defaultStopLossPercent, 0.03);
    });

    test('a half-written document keeps the values it does not carry', () async {
      // A missing field must not silently reset a capital the user configured.
      await seed({'maxRiskPercent': 0.01});

      await cubit.followAccount(uid);
      await settled();

      expect(cubit.settings!.maxRiskPercent, 0.01);
      expect(cubit.settings!.capital, Settings.defaultCapital);
    });

    test('an out-of-range value is ignored rather than adopted', () async {
      // The bounds mirror firestore.rules, because a document written before
      // those rules existed is not covered by them.
      await seed({'capital': -5.0, 'maxRiskPercent': 4.0});

      await cubit.followAccount(uid);
      await settled();

      expect(cubit.settings!.capital, Settings.defaultCapital);
      expect(cubit.settings!.maxRiskPercent, Settings.defaultMaxRiskPercent);
    });
  });

  group('the account/device split', () {
    test('the two percentages round-trip through the account', () async {
      // The whole reason they moved: while they were device-only the website
      // hard-coded 5% and 2%, so the same trade got two verdicts.
      await cubit.followAccount(uid);
      await settled();

      await cubit.setDefaultTakeProfitPercent(0.09);
      await cubit.setDefaultStopLossPercent(0.025);
      await Future<void>.delayed(Duration.zero);

      final stored = await repo.fetch(uid);
      expect(stored.defaultTakeProfitPercent, 0.09);
      expect(stored.defaultStopLossPercent, 0.025);
    });

    test('the two habit toggles never reach the account', () async {
      // They are habits — whether to be shown a checklist, whether to be asked
      // before a delete — and syncing a habit pushes one device's preference
      // onto another.
      await cubit.followAccount(uid);
      await settled();

      await cubit.setEnableChecklist(false);
      await cubit.setEnableConfirmations(false);
      await Future<void>.delayed(Duration.zero);

      final raw = await db
          .collection('users')
          .doc(uid)
          .collection('settings')
          .doc('risk')
          .get();

      expect(raw.data()?.containsKey('enableChecklist'), isNot(true));
      expect(raw.data()?.containsKey('enableConfirmations'), isNot(true));
      expect(cubit.settings!.enableChecklist, isFalse);
    });

    test('a document carrying a habit toggle cannot override the device', () async {
      // Applied after the remote read on purpose, so a stray field written by
      // another build never wins over this device's own answer.
      await device.setEnableChecklist(false);
      await seed({'capital': 50000.0, 'enableChecklist': true});

      await cubit.followAccount(uid);
      await settled();

      expect(cubit.settings!.enableChecklist, isFalse);
    });
  });

  group('writing', () {
    test('a valid capital is stored', () async {
      await cubit.followAccount(uid);
      await settled();

      await cubit.setCapital(120000);
      await Future<void>.delayed(Duration.zero);

      expect((await repo.fetch(uid)).capital, 120000);
    });

    test('an invalid value is refused rather than stored', () async {
      await cubit.followAccount(uid);
      await settled();

      await cubit.setCapital(0);
      await cubit.setCapital(double.nan);
      await cubit.setMaxRiskPercent(1.5);
      await Future<void>.delayed(Duration.zero);

      expect(cubit.settings!.capital, Settings.defaultCapital);
      expect(cubit.settings!.maxRiskPercent, Settings.defaultMaxRiskPercent);
    });

    test('writing while signed out is a no-op, not a crash', () async {
      await cubit.followAccount(null);
      await cubit.setCapital(120000);
      expect(cubit.state, isA<SettingsSignedOut>());
    });
  });

  group('device preferences', () {
    test('theme defaults to system and survives a write', () async {
      expect(cubit.themeMode, ThemeMode.system);
      await cubit.setThemeMode(ThemeMode.dark);
      expect(cubit.themeMode, ThemeMode.dark);
    });

    test('an empty Gemini key is removed, not stored as an empty string', () async {
      await device.setGeminiKey('abc123');
      expect(device.geminiKey, 'abc123');

      await device.setGeminiKey('   ');
      expect(device.geminiKey, isEmpty);
    });

    test('the safeguards default ON when nothing is stored', () async {
      // A missing preference must not quietly turn a safeguard off — deleting
      // a trade is not recoverable.
      expect(device.enableChecklist, isTrue);
      expect(device.enableConfirmations, isTrue);
    });
  });
}
