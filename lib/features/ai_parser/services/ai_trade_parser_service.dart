import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../models/ai_trade_data.dart';
import 'gemini_config.dart';

/// Raised when image analysis cannot be completed. Carries an Arabic,
/// user-facing message; the sheet shows it verbatim.
class AiParseException implements Exception {
  final String message;
  const AiParseException(this.message);
  @override
  String toString() => message;
}

/// Extracts trade details from a recommendation screenshot using Gemini vision.
///
/// This replaces an earlier stub that only ever pretended: it slept 1.2s and
/// returned values keyed off the file NAME, never opening the image. Now the
/// image bytes are actually sent to the model and the structured reply is
/// parsed. With no API key set it fails loudly ([AiParseException]) instead of
/// returning a convincing fake.
class AiTradeParserService {
  const AiTradeParserService._();

  static const _endpoint =
      'https://generativelanguage.googleapis.com/v1beta/models';

  /// The model is told exactly which fields to return, as strict JSON, so the
  /// reply can be parsed without heuristics. Egyptian tickers are short Latin
  /// codes (COMI, TMGH); prices are in EGP.
  static const _prompt = '''
حلل صورة توصية سهم من البورصة المصرية واستخرج البيانات.
أعِد JSON فقط بالمفاتيح دي بالظبط:
{
  "ticker": "كود السهم بالإنجليزي (مثل COMI) أو فارغ لو مش واضح",
  "direction": "buy أو sell",
  "entryPrice": رقم سعر الدخول أو null,
  "stopLoss": رقم وقف الخسارة أو null,
  "takeProfit": رقم الهدف أو null,
  "notes": "أي ملاحظة مهمة بالعربي، أو فارغ"
}
متردّش أي نص خارج الـ JSON.''';

  static Future<AiTradeData> parseTradeImage(File imageFile) async {
    if (!GeminiConfig.isConfigured) {
      throw const AiParseException(
        'التحليل بالذكاء الاصطناعي مش متظبط في النسخة دي. '
        'ضيف مفتاح Gemini عشان تشغّله.',
      );
    }

    final bytes = await imageFile.readAsBytes();
    if (bytes.isEmpty) {
      throw const AiParseException('الصورة فاضية أو مش مقروءة.');
    }

    final uri = Uri.parse(
      '$_endpoint/${GeminiConfig.model}:generateContent'
      '?key=${GeminiConfig.apiKey}',
    );

    final body = jsonEncode({
      'contents': [
        {
          'parts': [
            {'text': _prompt},
            {
              'inline_data': {
                'mime_type': _mimeType(imageFile.path),
                'data': base64Encode(bytes),
              },
            },
          ],
        },
      ],
      // Force a JSON reply and kill creativity — this is extraction, not prose.
      'generationConfig': {
        'responseMimeType': 'application/json',
        'temperature': 0,
      },
    });

    http.Response response;
    try {
      response = await http
          .post(uri, headers: {'Content-Type': 'application/json'}, body: body)
          .timeout(const Duration(seconds: 30));
    } on SocketException {
      throw const AiParseException('مفيش اتصال بالإنترنت. جرّب تاني.');
    } catch (_) {
      throw const AiParseException('تعذّر الاتصال بخدمة التحليل.');
    }

    if (response.statusCode == 400 || response.statusCode == 403) {
      throw const AiParseException(
        'مفتاح Gemini غير صالح أو مرفوض. راجع الإعدادات.',
      );
    }
    if (response.statusCode != 200) {
      throw AiParseException('تعذّر التحليل (خطأ ${response.statusCode}).');
    }

    return _parseResponse(response.body);
  }

  static AiTradeData _parseResponse(String responseBody) {
    try {
      final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
      final candidates = decoded['candidates'] as List?;
      if (candidates == null || candidates.isEmpty) {
        throw const AiParseException('مقدرش يقرا الصورة. جرّب صورة أوضح.');
      }

      final parts =
          ((candidates.first as Map)['content'] as Map?)?['parts'] as List?;
      final text = parts?.isNotEmpty == true
          ? (parts!.first as Map)['text'] as String?
          : null;
      if (text == null || text.trim().isEmpty) {
        throw const AiParseException('التحليل رجع فاضي. جرّب تاني.');
      }

      final data = jsonDecode(text) as Map<String, dynamic>;
      final result = AiTradeData(
        ticker: (data['ticker'] as String? ?? '').trim().toUpperCase(),
        direction: (data['direction'] as String?) == 'sell' ? 'sell' : 'buy',
        entryPrice: _toDouble(data['entryPrice']),
        stopLoss: _toDouble(data['stopLoss']),
        takeProfit: _toDouble(data['takeProfit']),
        notes: (data['notes'] as String? ?? '').trim(),
      );

      if (!result.isValid) {
        throw const AiParseException(
          'مقدرش يطلّع بيانات كافية من الصورة. جرّب صورة أوضح أو دخّلها يدوي.',
        );
      }
      return result;
    } on AiParseException {
      rethrow;
    } catch (_) {
      throw const AiParseException('رد التحليل مش مفهوم. جرّب تاني.');
    }
  }

  static double? _toDouble(Object? value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value.replaceAll(',', '.'));
    return null;
  }

  static String _mimeType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
}
