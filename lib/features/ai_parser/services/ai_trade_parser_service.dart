import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
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

  /// Images are capped so one tap cannot assemble a request big enough to be
  /// rejected outright — every image is base64'd into the body.
  static const int maxImages = 10;

  /// The model is told exactly which fields to return, as strict JSON, so the
  /// reply can be parsed without heuristics. Egyptian tickers are short Latin
  /// codes (COMI, TMGH); prices are in EGP.
  ///
  /// It asks for a LIST because one screenshot routinely holds several
  /// recommendations, and several screenshots are sent at once. A prompt that
  /// asked for one object made the model pick a winner and silently drop the
  /// rest.
  static const _prompt = '''
حلل صور توصيات أسهم من البورصة المصرية واستخرج كل الصفقات اللي فيها.
الصور ممكن تكون أكتر من صورة، وكل صورة ممكن تحتوي أكتر من صفقة.
أعِد JSON فقط بالشكل ده بالظبط:
{
  "trades": [
    {
      "ticker": "كود السهم بالإنجليزي (مثل COMI) أو فارغ لو مش واضح",
      "direction": "buy أو sell",
      "entryPrice": رقم سعر الدخول أو null,
      "stopLoss": رقم وقف الخسارة أو null,
      "takeProfit": رقم الهدف أو null,
      "notes": "أي ملاحظة مهمة بالعربي، أو فارغ"
    }
  ]
}
حط كل صفقة لوحدها في عنصر منفصل، ومتدمجش صفقتين مع بعض.
لو مفيش غير صفقة واحدة، رجّع قايمة فيها عنصر واحد.
متردّش أي نص خارج الـ JSON.''';

  /// Extracts every trade visible across [imageFiles].
  ///
  /// All images go in ONE request rather than one request each: it is a single
  /// round trip instead of N, and the model sees them together, so a
  /// recommendation split across two screenshots still reads as one trade.
  static Future<List<AiTradeData>> parseTradeImages(
    List<File> imageFiles,
  ) async {
    if (!GeminiConfig.isConfigured) {
      throw const AiParseException(
        'التحليل بالذكاء الاصطناعي مش متظبط في النسخة دي. '
        'ضيف مفتاح Gemini عشان تشغّله.',
      );
    }
    if (imageFiles.isEmpty) {
      throw const AiParseException('اختار صورة واحدة على الأقل.');
    }
    if (imageFiles.length > maxImages) {
      throw const AiParseException(
        'أقصى عدد صور في المرة الواحدة $maxImages. جرّب على دفعات.',
      );
    }

    final imageParts = <Map<String, Object?>>[];
    for (final file in imageFiles) {
      final bytes = await file.readAsBytes();
      // Skipped, not fatal: one unreadable pick should not throw away the
      // other nine images the user just chose.
      if (bytes.isEmpty) continue;
      imageParts.add({
        'inline_data': {
          'mime_type': _mimeType(file.path),
          'data': base64Encode(bytes),
        },
      });
    }
    if (imageParts.isEmpty) {
      throw const AiParseException('الصور فاضية أو مش مقروءة.');
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
            ...imageParts,
          ],
        },
      ],
      // Force a JSON reply and kill creativity — this is extraction, not prose.
      'generationConfig': {
        'responseMimeType': 'application/json',
        'temperature': 0,
        // Reading a few numbers off an image needs no deliberation, and on
        // Gemini 3 reasoning shares the output budget — left unbounded it can
        // hit MAX_TOKENS before any answer is produced.
        'thinkingConfig': {'thinkingLevel': 'low'},
        // Scaled to the number of trades that may come back, since a list of
        // ten costs roughly ten times a single object.
        'maxOutputTokens': 1024 + 512 * imageParts.length,
      },
    });

    http.Response response;
    try {
      response = await http
          .post(uri, headers: {'Content-Type': 'application/json'}, body: body)
          // Several images take longer to upload and to read than one.
          .timeout(Duration(seconds: 30 + 15 * imageParts.length));
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

  /// Parses a raw API body. Exposed for tests so the response handling can be
  /// verified against real Gemini payload shapes without a key or a network.
  @visibleForTesting
  static List<AiTradeData> debugParse(String responseBody) =>
      _parseResponse(responseBody);

  static List<AiTradeData> _parseResponse(String responseBody) {
    // Deliberately no blanket try/catch around the whole body any more. The
    // old one turned every distinct failure — a truncated reply, an unexpected
    // field type, a refusal — into the same "رد التحليل مش مفهوم", which is
    // what made this so hard to diagnose. Each step now fails with its own
    // reason, and only genuinely unknown shapes reach the generic message.
    final Object? decodedBody;
    try {
      decodedBody = jsonDecode(responseBody);
    } catch (_) {
      throw const AiParseException('رد الخدمة مش JSON صالح. جرّب تاني.');
    }
    if (decodedBody is! Map) {
      throw const AiParseException('رد الخدمة جه بشكل غير متوقع. جرّب تاني.');
    }

    // The API reports refusals and quota problems in a 200 body.
    if (decodedBody['error'] case final Map error?) {
      throw AiParseException(
        'الخدمة رفضت الطلب: ${error['message'] ?? 'سبب غير معروف'}',
      );
    }

    final candidates = decodedBody['candidates'];
    if (candidates is! List || candidates.isEmpty) {
      // A blocked image never produces a candidate, so without this the user
      // is told the picture was unclear when it was actually refused.
      final blocked = (decodedBody['promptFeedback'] as Map?)?['blockReason'];
      if (blocked != null) {
        throw AiParseException('الصورة اترفضت من الخدمة ($blocked).');
      }
      throw const AiParseException('مقدرش يقرا الصورة. جرّب صورة أوضح.');
    }

    final candidate = candidates.first;
    if (candidate is! Map) {
      throw const AiParseException('رد الخدمة جه بشكل غير متوقع. جرّب تاني.');
    }
    final finishReason = candidate['finishReason'];
    final parts = (candidate['content'] as Map?)?['parts'];

    // Every non-thought text part, JOINED — not just the first one.
    //
    // Two separate traps live here. Gemini 3 emits reasoning parts beside the
    // answer, each flagged `thought: true` and carrying either no text or the
    // model's private reasoning, so the answer is not necessarily part zero.
    // And the answer itself can be split across several text parts, so taking
    // only the first returned JSON cut off mid-object — which parsed as
    // nothing and surfaced as "رد التحليل مش مفهوم" even though the reply was
    // complete.
    final text = (parts is List ? parts : const [])
        .whereType<Map>()
        .where((p) => p['thought'] != true)
        .map((p) => p['text'])
        .whereType<String>()
        .join();

    if (text.trim().isEmpty) {
      throw AiParseException(_emptyReason(finishReason));
    }

    final objects = _decodeTrades(text);
    if (objects == null) {
      // Truncated mid-JSON: there IS text, so the empty-reply branch above
      // never sees it, and without this the user gets "unclear" for what is
      // really a length problem.
      if (finishReason == 'MAX_TOKENS') {
        throw const AiParseException(
          'التحليل طال أوي وماخلصش. جرّب صور أوضح أو أقل.',
        );
      }
      throw const AiParseException('رد التحليل مش مفهوم. جرّب تاني.');
    }

    // Unusable entries are dropped rather than failing the batch: one blurry
    // recommendation among six should not cost the other five.
    final results = objects.map(_toTradeData).where((t) => t.isValid).toList();

    if (results.isEmpty) {
      if (finishReason == 'MAX_TOKENS') {
        throw const AiParseException(
          'التحليل طال أوي وماخلصش. جرّب صور أوضح أو أقل.',
        );
      }
      throw const AiParseException(
        'مقدرش يطلّع بيانات كافية من الصور. جرّب صور أوضح أو دخّلها يدوي.',
      );
    }
    return results;
  }

  static AiTradeData _toTradeData(Map<String, dynamic> data) => AiTradeData(
    ticker: _toText(data['ticker']).trim().toUpperCase(),
    direction: _toText(data['direction']).trim().toLowerCase() == 'sell'
        ? 'sell'
        : 'buy',
    entryPrice: _toDouble(data['entryPrice']),
    stopLoss: _toDouble(data['stopLoss']),
    takeProfit: _toDouble(data['takeProfit']),
    notes: _toText(data['notes']).trim(),
  );

  /// Why a candidate came back with no usable text.
  static String _emptyReason(Object? finishReason) => switch (finishReason) {
    // Reasoning ate the output budget before any answer was produced.
    'MAX_TOKENS' => 'التحليل طال أوي وماخلصش. جرّب صورة أوضح أو أصغر.',
    'SAFETY' || 'PROHIBITED_CONTENT' =>
      'الخدمة رفضت تحلل الصورة دي. جرّب صورة تانية.',
    'RECITATION' => 'الخدمة رفضت الرد على الصورة دي. جرّب صورة تانية.',
    _ => 'التحليل رجع فاضي. جرّب تاني.',
  };

  /// The trade objects inside a model reply, or null if there are none.
  ///
  /// `responseMimeType: application/json` normally guarantees clean JSON, but a
  /// model that falls back to plain text wraps it in a ``` fence or buries it
  /// in a sentence, and neither is worth failing the whole parse over.
  ///
  /// Three shapes are accepted, because the model does not reliably pick one:
  /// the requested `{"trades": [...]}`, a bare `[...]`, and a lone `{...}` for
  /// a single trade — which is what earlier prompt versions produced and what
  /// the model still returns when an image holds exactly one recommendation.
  static List<Map<String, dynamic>>? _decodeTrades(String raw) {
    final text = _stripFences(raw);

    final direct = _tryDecodeTrades(text);
    if (direct != null) return direct;

    // Prose around the JSON: take the outermost bracket pair and retry. The
    // array is tried first so a `{"trades": [...]}` wrapper is not mistaken
    // for the trade itself.
    for (final (open, close) in const [('[', ']'), ('{', '}')]) {
      final start = text.indexOf(open);
      final end = text.lastIndexOf(close);
      if (start != -1 && end > start) {
        final found = _tryDecodeTrades(text.substring(start, end + 1));
        if (found != null) return found;
      }
    }
    return null;
  }

  static List<Map<String, dynamic>>? _tryDecodeTrades(String source) {
    final Object? value;
    try {
      value = jsonDecode(source);
    } catch (_) {
      return null;
    }

    if (value is List) return _objectsIn(value);
    if (value is! Map) return null;

    // The requested wrapper. Other plausible key names are accepted too — the
    // model occasionally renames it despite the prompt.
    for (final key in const ['trades', 'صفقات', 'results', 'data', 'items']) {
      if (value[key] case final List list) {
        final objects = _objectsIn(list);
        if (objects != null) return objects;
      }
    }

    // A lone object is one trade.
    return [value.cast<String, dynamic>()];
  }

  static List<Map<String, dynamic>>? _objectsIn(List<Object?> list) {
    final objects = list
        .whereType<Map>()
        .map((e) => e.cast<String, dynamic>())
        .toList();
    return objects.isEmpty ? null : objects;
  }

  /// Unwraps a ```json fence.
  static String _stripFences(String raw) {
    var text = raw.trim();
    if (!text.startsWith('```')) return text;
    text = text.replaceFirst(RegExp(r'^```[a-zA-Z]*\s*'), '');
    final end = text.lastIndexOf('```');
    if (end != -1) text = text.substring(0, end);
    return text.trim();
  }

  /// Coerces a field to text instead of casting it.
  ///
  /// `as String?` threw on anything else, and the throw was swallowed into the
  /// generic parse failure — so a model returning `notes` as a list of bullets,
  /// or a numeric ticker, killed the entire result rather than one field.
  static String _toText(Object? value) {
    if (value == null) return '';
    if (value is String) return value;
    if (value is List) {
      return value.map(_toText).where((s) => s.trim().isNotEmpty).join('، ');
    }
    return value.toString();
  }

  static double? _toDouble(Object? value) {
    if (value is num) return value.isFinite ? value.toDouble() : null;
    if (value is! String) return null;

    // Arabic-Indic digits first: the model is prompted in Arabic and sometimes
    // answers with ٠-٩, which double.tryParse rejects outright.
    final normalised = value.replaceAllMapped(
      RegExp(r'[٠-٩]'),
      (m) => '${m.group(0)!.codeUnitAt(0) - 0x0660}',
    );

    // Take the first number-shaped run rather than deleting everything that is
    // not a digit: "140.00 ج.م" would otherwise keep the dot out of "ج.م" and
    // leave the unparseable "140.00.".
    final match = RegExp(r'-?\d[\d.,]*').firstMatch(normalised);
    if (match == null) return null;
    var text = match.group(0)!.replaceAll(RegExp(r'[.,]+$'), '');

    // Whichever separator comes last is the decimal one, which is what tells
    // "1,234.50" (thousands comma) from "1.180,25" (decimal comma). The old
    // code turned every comma into a dot, making the first "1.234.50" — not a
    // number — so the price was dropped without a word.
    final lastComma = text.lastIndexOf(',');
    final lastDot = text.lastIndexOf('.');
    if (lastComma > lastDot) {
      final whole = text.substring(0, lastComma).replaceAll(RegExp('[.,]'), '');
      text = '$whole.${text.substring(lastComma + 1)}';
    } else {
      text = text.replaceAll(',', '');
    }

    return double.tryParse(text);
  }

  static String _mimeType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
}
