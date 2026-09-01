// The JavaScript entry point. Binds tool/calc_js/calc_api.dart onto
// globalThis.radarCalc and does nothing else — every line of logic lives in
// that file, which is pure Dart and runs on the VM too.
//
// Build:  dart compile js -O4 -o <out>.js tool/calc_js/radar_calc.dart
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'calc_api.dart';

void main() {
  final api = JSObject();

  void bind(String name, String Function(String) fn) {
    api.setProperty(name.toJS, ((JSString input) => fn(input.toDart).toJS).toJS);
  }

  bind('analytics', analytics);
  bind('stats', stats);
  bind('decisions', decisions);
  bind('scenarios', scenarios);
  bind('riskScore', riskScore);
  bind('tradeMetrics', tradeMetrics);
  bind('sizing', sizing);
  bind('smartTrade', smartTrade);
  bind('goalPlan', goalPlan);
  bind('projection', projection);
  bind('entitlement', entitlement);
  bind('riskMath', riskMath);
  bind('checklist', checklist);
  bind('flowsHistory', flowsHistory);

  globalContext.setProperty('radarCalc'.toJS, api);
}
