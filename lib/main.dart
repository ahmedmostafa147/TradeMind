import 'package:cloud_firestore/cloud_firestore.dart' hide Settings;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'app.dart';
import 'billing/cubit/billing_cubit.dart';
import 'core/preferences/device_preferences.dart';
import 'core/preferences/device_prefs_cubit.dart';
import 'core/state/account_scoped_cubit.dart';
import 'features/auth/cubit/auth_cubit.dart';
import 'features/market/cubit/market_cubit.dart';
import 'settings/cubit/settings_cubit.dart';
import 'settings/data/settings_repository.dart';
import 'shell/shell_cubit.dart';
import 'trades/cubit/trades_cubit.dart';
import 'trades/data/trade_repository.dart';
import 'watchlist/cubit/watchlist_cubit.dart';
import 'watchlist/data/watchlist_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    // ── FIREBASE IS NO LONGER OPTIONAL ───────────────────────────────────────
    //
    // It used to be, and the comment here used to explain why: the journal was
    // local-first, so the app had to open with or without a backend and an init
    // failure was swallowed. There is no local journal any more. Without
    // Firebase there is no data, no session and nothing to show, so a failure
    // here is reported instead of hidden — a silent one would land the user in
    // an app whose every screen is empty for no stated reason.
    await Firebase.initializeApp();

    // Firestore's on-device cache stays ON (its default on mobile). It is not a
    // second store — it holds no answer the server did not give it, and the
    // server stays the source of truth. Turning it off would trade every weak
    // signal for a blank screen instead of the last known good one.
    final db = FirebaseFirestore.instance;

    final device = await DevicePreferences.open();

    final trades = TradesCubit(TradeRepository(db));
    final watchlist = WatchlistCubit(WatchlistRepository(db), trades);
    final settings = SettingsCubit(SettingsRepository(db), device);
    final billing = BillingCubit();
    final auth = AuthCubit();

    // ── THE ONE WIRE THAT MAKES THE ACCOUNT-SCOPED CUBITS WORK ──────────────
    //
    // Everything under `users/{uid}` needs a uid, and the only authority on
    // which one is Firebase Auth. Pointing the three cubits from here rather
    // than from a widget keeps the composition in the composition root, and
    // avoids the race a `BlocListener` would have: a listener only sees
    // CHANGES, so an auth event that resolved before the first build would be
    // missed and the journal would sit on a spinner until the next one.
    //
    // `AuthRestoring` is skipped deliberately — the cubits already start on
    // their loading state, which is the same thing said once.
    final scoped = <AccountScopedCubit<Object?>>[trades, watchlist, settings];
    void follow(AuthState state) {
      if (state is AuthRestoring) return;
      final userId = state is AuthSignedIn ? state.account.id : null;
      for (final cubit in scoped) {
        cubit.followAccount(userId);
      }
      billing.followAccount(userId);
    }

    follow(auth.state);
    auth.stream.listen(follow);

    runApp(
      MultiBlocProvider(
        providers: [
          BlocProvider.value(value: auth),
          BlocProvider.value(value: trades),
          BlocProvider.value(value: watchlist),
          BlocProvider.value(value: settings),
          BlocProvider.value(value: billing),
          BlocProvider(create: (_) => DevicePrefsCubit(device)),
          BlocProvider(create: (_) => MarketCubit()),
          BlocProvider(create: (_) => ShellCubit()),
        ],
        child: const EgxJournalApp(),
      ),
    );
  } catch (error) {
    runApp(StartupFailureApp(error));
  }
}
