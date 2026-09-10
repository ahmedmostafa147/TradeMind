import 'package:flutter/material.dart';

import 'widgets/compound_planner.dart';
import 'widgets/smart_trade_builder.dart';

/// The two calculators, on one screen.
///
/// WHY TABS AND NOT A FIFTH NAV DESTINATION
/// The bottom bar already carries four, and a fifth crowds the labels off in
/// Arabic. More to the point, these belong together: both answer "how much",
/// and someone who opened «الحاسبة» looking for one will find the other without
/// being told it exists.
///
/// The order is deliberate. «حاسبة الصفقة» is the one used daily and before
/// every trade, so it stays first and stays the default; «خطة الادخار» is
/// opened occasionally and thought about slowly.
class CalculatorScreen extends StatelessWidget {
  const CalculatorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('الحاسبة'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'حاسبة الصفقة'),
              Tab(text: 'خطة الادخار'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: SmartTradeBuilder(),
            ),
            SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: CompoundPlanner(),
            ),
          ],
        ),
      ),
    );
  }
}
