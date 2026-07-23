import 'package:flutter/material.dart';

import '../core/widgets/app_logo_title.dart';
import 'widgets/smart_trade_builder.dart';

/// The trade calculator. One builder now covers both flows — stop as a
/// percentage or as an absolute price — so there is no longer a separate manual
/// calculator below it.
class CalculatorScreen extends StatelessWidget {
  const CalculatorScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const AppLogoTitle(title: 'حاسبة الصفقة')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: SmartTradeBuilder(),
      ),
    );
  }
}
