import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../settings/cubit/settings_cubit.dart';
import '../../trades/cubit/trades_cubit.dart';
import '../../trades/trade.dart';
import '../../watchlist/cubit/watchlist_cubit.dart';
import '../../watchlist/watchlist_item.dart';

/// The three things a screen reading a Firestore stream has to be able to say,
/// written once.
///
/// The Hive version needed none of this — the box was open before `runApp`, so
/// the data was simply there. A stream has a first frame with nothing in it and
/// a real failure mode, and the difference between "you have no trades" and "we
/// could not read your trades" is the difference between a correct empty state
/// and the worst sentence a journal can show someone who has plenty.

/// Waiting for the first snapshot.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) =>
      const Center(child: CircularProgressIndicator());
}

/// A read that failed, with a way out.
///
/// The error text itself is shown small and last: it is a Firestore code, not
/// something the user can act on, but hiding it entirely leaves both them and
/// whoever they report it to with nothing to go on.
class FailureView extends StatelessWidget {
  final String message;
  final Object error;
  final VoidCallback? onRetry;

  const FailureView({
    super.key,
    required this.message,
    required this.error,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cloud_off_rounded,
              size: 40,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              FilledButton.tonal(
                onPressed: onRetry,
                child: const Text('حاول تاني'),
              ),
            ],
            const SizedBox(height: 12),
            Text(
              '$error',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Renders [builder] only once the journal has actually arrived.
class TradesBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, List<Trade> trades) builder;

  const TradesBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<TradesCubit, TradesState>(
      builder: (context, state) => switch (state) {
        TradesLoaded(:final trades) => builder(context, trades),
        TradesFailure(:final error) => FailureView(
          message: 'تعذّر تحميل صفقاتك. اتأكد من الإنترنت.',
          error: error,
          onRetry: context.read<TradesCubit>().retry,
        ),
        // Signed out renders as empty rather than as a message: the auth gate
        // is already showing the sign-in screen over this whole subtree, and a
        // second explanation underneath it would only ever be seen for the one
        // frame between signing out and the gate rebuilding.
        TradesSignedOut() => builder(context, const []),
        TradesLoading() => const LoadingView(),
      },
    );
  }
}

class WatchlistBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, List<WatchlistItem> items)
  builder;

  const WatchlistBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<WatchlistCubit, WatchlistState>(
      builder: (context, state) => switch (state) {
        WatchlistLoaded(:final items) => builder(context, items),
        WatchlistFailure(:final error) => FailureView(
          message: 'تعذّر تحميل قائمة المراقبة.',
          error: error,
          onRetry: context.read<WatchlistCubit>().retry,
        ),
        WatchlistSignedOut() => builder(context, const []),
        WatchlistLoading() => const LoadingView(),
      },
    );
  }
}

/// Holds the app until the account's risk rule has been read.
///
/// ── WHY THIS ONE IS A GATE AND THE OTHER TWO ARE BUILDERS ──────────────────
///
/// The journal and the watchlist are content: a screen can show a spinner in
/// the one place a list would go and stay perfectly usable around it. Capital
/// and the risk ceiling are not content — they divide into every position size,
/// every risk percentage and every over-risk warning in the product, on screens
/// that never mention settings at all. There is no local spinner to put them
/// behind, and letting the class defaults stand in for one frame does not show
/// nothing: it shows a confident wrong number in the one place the user is
/// trusting the app to be right.
///
/// So it waits, once, above everything. Below this widget `context.settings` is
/// non-null by construction.
class SettingsGate extends StatelessWidget {
  final Widget child;

  const SettingsGate({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SettingsCubit, SettingsState>(
      builder: (context, state) => switch (state) {
        SettingsLoaded() => child,
        SettingsFailure(:final error) => Scaffold(
          body: SafeArea(
            child: FailureView(
              message:
                  'تعذّر تحميل إعدادات المخاطرة بتاعتك.\n'
                  'من غيرها الأرقام هتطلع غلط، فالتطبيق مستنيها.',
              error: error,
              onRetry: context.read<SettingsCubit>().retry,
            ),
          ),
        ),
        // Signed out cannot be reached in practice — the auth gate is outside
        // this one — but a Scaffold is still the right answer for the frame
        // between a sign-out and that gate rebuilding.
        SettingsSignedOut() => const Scaffold(body: LoadingView()),
        SettingsLoading() => const Scaffold(body: LoadingView()),
      },
    );
  }
}
