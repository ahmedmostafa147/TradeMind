import 'dart:io';

import 'package:egx_trade_journal/core/app_version.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('kAppVersion matches the version in pubspec.yaml', () {
    final pubspec = File('pubspec.yaml').readAsStringSync();

    // `version: 1.0.0+1` — the build number after `+` is Play's versionCode
    // and is not part of what a user would call the version.
    final match = RegExp(
      r'^version:\s*([0-9]+\.[0-9]+\.[0-9]+)',
      multiLine: true,
    ).firstMatch(pubspec);

    expect(
      match,
      isNotNull,
      reason: 'pubspec.yaml has no parseable `version:` line.',
    );

    expect(
      kAppVersion,
      match!.group(1),
      reason: 'lib/core/app_version.dart drifted from pubspec.yaml. Every user '
          'profile would report a version that is no longer shipping. Update '
          'kAppVersion to match.',
    );
  });
}
