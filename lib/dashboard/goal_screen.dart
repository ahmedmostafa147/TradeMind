import 'package:flutter/material.dart';

import '../shell/home_shell.dart';
import 'goal_view.dart';

/// Screen for «الهدف» destination in the main bottom navigation bar.
class GoalScreen extends StatelessWidget {
  const GoalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الهدف'),
        actions: const [SettingsAction()],
      ),
      body: const GoalView(),
    );
  }
}
