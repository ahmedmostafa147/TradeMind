import 'package:flutter_bloc/flutter_bloc.dart';

/// Which of the shell's destinations is showing.
///
/// Lives above the shell rather than in its State so the settings icon in every
/// screen's app bar can switch to «الإعدادات» without a callback threaded
/// through six widgets.
class ShellCubit extends Cubit<int> {
  ShellCubit() : super(0);

  void select(int index) => emit(index);
}

/// «الإعدادات» is reachable from the app bar of every tab, so its index is
/// named rather than repeated.
const int kSettingsIndex = 5;
