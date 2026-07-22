import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../trades/trade_draft.dart';
import '../../../trades/trade_form_screen.dart';
import '../../market/widgets/stock_quote_badge.dart';
import '../models/ai_trade_data.dart';
import '../services/ai_trade_parser_service.dart';

/// Modal sheet to upload trade screenshot and extract full trade using AI.
class AiTradeSheet extends StatefulWidget {
  const AiTradeSheet({super.key});

  @override
  State<AiTradeSheet> createState() => _AiTradeSheetState();
}

class _AiTradeSheetState extends State<AiTradeSheet> {
  File? _image;
  bool _analyzing = false;
  AiTradeData? _extracted;

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source);
    if (picked == null) return;

    final file = File(picked.path);
    setState(() {
      _image = file;
      _analyzing = true;
      _extracted = null;
    });

    final extracted = await AiTradeParserService.parseTradeImage(file);
    if (mounted) {
      setState(() {
        _extracted = extracted;
        _analyzing = false;
      });
    }
  }

  void _createTrade() {
    final data = _extracted;
    if (data == null) return;

    final draft = TradeDraft(
      ticker: data.ticker,
      entryPrice: data.entryPrice,
      stopPrice: data.stopLoss,
      takeProfitPrice: data.takeProfit,
      reason: data.notes,
    );

    Navigator.of(context).pop();
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => TradeFormScreen(draft: draft)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final data = _extracted;

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: Colors.amber, size: 28),
              const SizedBox(width: 10),
              Text(
                'قراءة التوصية بالذكاء الاصطناعي',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'ارفع صورة توصية أو سكرين شوت وسيتم تحويلها لصفقة جاهزة.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          if (_image == null) ...[
            _SourceButtons(onPick: _pickImage),
          ] else if (_analyzing) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('جاري تحليل التوصية وقراءة أسعار الأسهم...'),
                  ],
                ),
              ),
            ),
          ] else if (data != null) ...[
            StockQuoteBadge(symbol: data.ticker),
            const SizedBox(height: 16),
            _ExtractedPreviewCard(data: data),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _createTrade,
              icon: const Icon(Icons.check_circle),
              label: const Text('فتح الصفقة الجاهزة الآن'),
            ),
          ],
        ],
      ),
    );
  }
}

class _SourceButtons extends StatelessWidget {
  final ValueChanged<ImageSource> onPick;

  const _SourceButtons({required this.onPick});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => onPick(ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: const Text('المعرض'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => onPick(ImageSource.camera),
            icon: const Icon(Icons.camera_alt),
            label: const Text('الكاميرا'),
          ),
        ),
      ],
    );
  }
}

class _ExtractedPreviewCard extends StatelessWidget {
  final AiTradeData data;

  const _ExtractedPreviewCard({required this.data});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'السهم المستخرج: ${data.ticker}',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text('سعر الدخول: ${data.entryPrice ?? 'غير محدد'}'),
            Text('وقف الخسارة: ${data.stopLoss ?? 'غير محدد'}'),
            Text('الهدف: ${data.takeProfit ?? 'غير محدد'}'),
          ],
        ),
      ),
    );
  }
}
