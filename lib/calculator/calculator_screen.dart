import 'package:flutter/material.dart';

import '../shell/home_shell.dart';
import 'widgets/smart_trade_builder.dart';

/// The trade calculator. One builder now covers both flows — stop as a
/// percentage or as an absolute price — so there is no longer a separate manual
/// calculator below it.
class CalculatorScreen extends StatelessWidget {
  const CalculatorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('حاسبة الصفقة'),
        actions: const [SettingsAction()],
      ),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: SmartTradeBuilder(),
      ),
    );
  }
}
