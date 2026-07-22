import 'package:flutter/foundation.dart';

/// Structured trade details extracted from AI image analysis.
@immutable
class AiTradeData {
  final String ticker;
  final String direction; // 'buy' or 'sell'
  final double? entryPrice;
  final double? stopLoss;
  final double? takeProfit;
  final String notes;

  const AiTradeData({
    required this.ticker,
    this.direction = 'buy',
    this.entryPrice,
    this.stopLoss,
    this.takeProfit,
    this.notes = '',
  });

  bool get isValid =>
      ticker.isNotEmpty && (entryPrice != null || stopLoss != null);
}
