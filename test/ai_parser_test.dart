import 'dart:convert';

import 'package:egx_trade_journal/features/ai_parser/models/ai_trade_data.dart';
import 'package:egx_trade_journal/features/ai_parser/services/ai_trade_parser_service.dart';
import 'package:flutter_test/flutter_test.dart';

/// Guards the response parsing against the shapes Gemini actually returns.
///
/// Two reported failures are pinned here, both of which surfaced as the same
/// unhelpful "رد التحليل مش مفهوم". Gemini 3 emits reasoning parts next to the
/// answer and the parser read `parts.first`, which is a thought carrying no
/// usable text. And the answer itself can arrive split across several text
/// parts, so reading only one of them produced JSON cut off mid-object.
String _body(List<Map<String, dynamic>> parts, {String? finishReason}) =>
    jsonEncode({
      'candidates': [
        {'content': {'parts': parts}, 'finishReason': finishReason ?? 'STOP'},
      ],
    });

const _payload = {
  'ticker': 'COMI',
  'direction': 'buy',
  'entryPrice': 140.0,
  'stopLoss': 132.5,
  'takeProfit': 155.0,
  'notes': 'اختراق مقاومة',
};

const _second = {
  'ticker': 'TMGH',
  'direction': 'buy',
  'entryPrice': 52.0,
  'stopLoss': 49.0,
  'takeProfit': 60.0,
};

/// The parser is a batch API now. Most cases here describe one trade, so this
/// asserts exactly one came back and hands it over.
AiTradeData _one(String responseBody) {
  final all = AiTradeParserService.debugParse(responseBody);
  expect(all, hasLength(1));
  return all.single;
}

void main() {
  group('reads the answer', () {
    test('from a plain single-part reply', () {
      final data = _one(
        _body([
          {'text': jsonEncode(_payload)},
        ]),
      );

      expect(data.ticker, 'COMI');
      expect(data.entryPrice, 140.0);
      expect(data.stopLoss, 132.5);
      expect(data.takeProfit, 155.0);
    });

    test('skips a leading thought part — the reported bug', () {
      final data = _one(
        _body([
          {'text': 'دعني أفكر في الأسعار الظاهرة...', 'thought': true},
          {'text': jsonEncode(_payload)},
        ]),
      );

      expect(data.ticker, 'COMI');
      expect(data.entryPrice, 140.0);
    });

    test('skips a thought part carrying no text at all', () {
      final data = _one(
        _body([
          {'thought': true},
          {'text': jsonEncode(_payload)},
        ]),
      );

      expect(data.ticker, 'COMI');
    });

    test('unwraps a ```json fence', () {
      final data = _one(
        _body([
          {'text': '```json\n${jsonEncode(_payload)}\n```'},
        ]),
      );

      expect(data.ticker, 'COMI');
      expect(data.stopLoss, 132.5);
    });

    test('joins an answer split across several text parts', () {
      // The remaining cause of "رد التحليل مش مفهوم" after the thought-part
      // fix: Gemini may return one answer as several text parts. Reading only
      // the first gave `{"ticker": "COMI", "entryP` — valid text, invalid
      // JSON — so the reply was complete and the app still refused it.
      final json = jsonEncode(_payload);
      final split = json.length ~/ 2;

      final data = _one(
        _body([
          {'text': json.substring(0, split)},
          {'text': json.substring(split)},
        ]),
      );

      expect(data.ticker, 'COMI');
      expect(data.entryPrice, 140.0);
      expect(data.stopLoss, 132.5);
    });

    test('joins the answer parts while still dropping the thought ones', () {
      final json = jsonEncode(_payload);
      final split = json.length ~/ 2;

      final data = _one(
        _body([
          {'text': 'خليني أبص على الأرقام', 'thought': true},
          {'text': json.substring(0, split)},
          {'text': json.substring(split)},
        ]),
      );

      expect(data.ticker, 'COMI');
      expect(data.takeProfit, 155.0);
    });

    test('digs the object out of surrounding prose', () {
      final data = _one(
        _body([
          {'text': 'دي البيانات المستخرجة:\n${jsonEncode(_payload)}\nتمام.'},
        ]),
      );

      expect(data.ticker, 'COMI');
    });

    test('unwraps a single-element array', () {
      final data = _one(
        _body([
          {
            'text': jsonEncode([_payload]),
          },
        ]),
      );

      expect(data.ticker, 'COMI');
    });

    test('survives notes returned as a list instead of a string', () {
      // `as String?` threw here, and the throw was swallowed into the generic
      // parse failure — losing a perfectly good ticker and price over a field
      // that is only ever decoration.
      final data = _one(
        _body([
          {
            'text': jsonEncode({
              'ticker': 'COMI',
              'entryPrice': 140,
              'notes': ['اختراق مقاومة', 'حجم عالي'],
            }),
          },
        ]),
      );

      expect(data.ticker, 'COMI');
      expect(data.entryPrice, 140.0);
      expect(data.notes, 'اختراق مقاومة، حجم عالي');
    });

    test('survives a numeric ticker', () {
      final data = _one(
        _body([
          {
            'text': jsonEncode({'ticker': 1234, 'entryPrice': 10.5}),
          },
        ]),
      );

      expect(data.ticker, '1234');
    });

    test('reads a price written with a thousands separator', () {
      // "1,234.50" used to become "1.234.50" and parse as null, dropping the
      // price without a word.
      final data = _one(
        _body([
          {
            'text': jsonEncode({
              'ticker': 'COMI',
              'entryPrice': '1,234.50',
              'stopLoss': '1.180,25',
              'takeProfit': '140.00 ج.م',
            }),
          },
        ]),
      );

      expect(data.entryPrice, 1234.50, reason: 'comma is thousands here');
      expect(data.stopLoss, 1180.25, reason: 'comma is the decimal here');
      expect(data.takeProfit, 140.0, reason: 'currency suffix ignored');
    });

    test('reads a price written in Arabic-Indic digits', () {
      final data = _one(
        _body([
          {
            'text': jsonEncode({'ticker': 'COMI', 'entryPrice': '١٤٠.٥'}),
          },
        ]),
      );

      expect(data.entryPrice, 140.5);
    });

    test('accepts prices sent as strings', () {
      final data = _one(
        _body([
          {
            'text': jsonEncode({
              'ticker': 'tmgh',
              'entryPrice': '100.5',
              'stopLoss': '95',
            }),
          },
        ]),
      );

      expect(data.ticker, 'TMGH', reason: 'uppercased');
      expect(data.entryPrice, 100.5);
      expect(data.stopLoss, 95.0);
    });
  });

  group('several trades at once', () {
    test('reads every trade out of the requested wrapper', () {
      final all = AiTradeParserService.debugParse(
        _body([
          {
            'text': jsonEncode({
              'trades': [_payload, _second],
            }),
          },
        ]),
      );

      expect(all, hasLength(2));
      expect(all.map((t) => t.ticker), ['COMI', 'TMGH']);
      expect(all[1].entryPrice, 52.0);
      expect(all[1].takeProfit, 60.0);
    });

    test('reads a bare array too', () {
      final all = AiTradeParserService.debugParse(
        _body([
          {
            'text': jsonEncode([_payload, _second]),
          },
        ]),
      );

      expect(all.map((t) => t.ticker), ['COMI', 'TMGH']);
    });

    test('a lone object is still one trade, not a failure', () {
      // Earlier prompt versions asked for a single object, and the model still
      // returns one when an image holds exactly one recommendation.
      final all = AiTradeParserService.debugParse(
        _body([
          {'text': jsonEncode(_payload)},
        ]),
      );

      expect(all, hasLength(1));
      expect(all.single.ticker, 'COMI');
    });

    test('a renamed wrapper key is still understood', () {
      final all = AiTradeParserService.debugParse(
        _body([
          {
            'text': jsonEncode({
              'results': [_payload, _second],
            }),
          },
        ]),
      );

      expect(all, hasLength(2));
    });

    test('one unreadable entry does not cost the readable ones', () {
      // The whole point of a batch: a blurry recommendation among several must
      // not throw away the trades that did come through.
      final all = AiTradeParserService.debugParse(
        _body([
          {
            'text': jsonEncode({
              'trades': [
                _payload,
                {'ticker': '', 'notes': 'مش واضحة'},
                _second,
              ],
            }),
          },
        ]),
      );

      expect(all.map((t) => t.ticker), ['COMI', 'TMGH']);
    });

    test('a list split across text parts is joined before decoding', () {
      final json = jsonEncode({
        'trades': [_payload, _second],
      });
      final third = json.length ~/ 3;

      final all = AiTradeParserService.debugParse(
        _body([
          {'text': 'بفكر...', 'thought': true},
          {'text': json.substring(0, third)},
          {'text': json.substring(third, third * 2)},
          {'text': json.substring(third * 2)},
        ]),
      );

      expect(all.map((t) => t.ticker), ['COMI', 'TMGH']);
    });

    test('a wrapper buried in prose is still found', () {
      final all = AiTradeParserService.debugParse(
        _body([
          {
            'text':
                'لقيت صفقتين:\n'
                '${jsonEncode({'trades': [_payload, _second]})}\n'
                'دول كل اللي في الصور.',
          },
        ]),
      );

      expect(all, hasLength(2));
    });
  });

  group('fails clearly', () {
    test('a token exhaustion says so instead of "unclear"', () {
      expect(
        () => _one(
          _body([
            {'text': 'thinking...', 'thought': true},
          ], finishReason: 'MAX_TOKENS'),
        ),
        throwsA(
          isA<AiParseException>().having(
            (e) => e.message,
            'message',
            contains('طال'),
          ),
        ),
      );
    });

    test('an API error in a 200 body is surfaced', () {
      expect(
        () => _one(
          jsonEncode({
            'error': {'message': 'API key not valid'},
          }),
        ),
        throwsA(
          isA<AiParseException>().having(
            (e) => e.message,
            'message',
            contains('API key not valid'),
          ),
        ),
      );
    });

    test('truncated JSON blames the length, not the reader', () {
      // There IS text here, so the empty-reply branch never sees it; without
      // an explicit check this surfaced as the catch-all "مش مفهوم".
      expect(
        () => _one(
          _body([
            {'text': '{"ticker": "COMI", "entryPri'},
          ], finishReason: 'MAX_TOKENS'),
        ),
        throwsA(
          isA<AiParseException>().having(
            (e) => e.message,
            'message',
            contains('طال'),
          ),
        ),
      );
    });

    test('a safety refusal says it was refused', () {
      expect(
        () => _one(
          _body(const [], finishReason: 'SAFETY'),
        ),
        throwsA(
          isA<AiParseException>().having(
            (e) => e.message,
            'message',
            contains('رفضت'),
          ),
        ),
      );
    });

    test('a blocked prompt is reported as blocked, not as a blurry image', () {
      expect(
        () => _one(
          jsonEncode({
            'promptFeedback': {'blockReason': 'SAFETY'},
          }),
        ),
        throwsA(
          isA<AiParseException>().having(
            (e) => e.message,
            'message',
            contains('اترفضت'),
          ),
        ),
      );
    });

    test('a body that is not JSON at all says so', () {
      expect(
        () => _one('<html>502 Bad Gateway</html>'),
        throwsA(
          isA<AiParseException>().having(
            (e) => e.message,
            'message',
            contains('JSON'),
          ),
        ),
      );
    });

    test('a reply with no usable fields is rejected, not half-accepted', () {
      expect(
        () => _one(
          _body([
            {
              'text': jsonEncode({'ticker': '', 'notes': 'مش واضح'}),
            },
          ]),
        ),
        throwsA(isA<AiParseException>()),
      );
    });
  });
}
