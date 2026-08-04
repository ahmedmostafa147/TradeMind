import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Guards the account-deletion contract at the SOURCE level.
///
/// WHY NOT A BEHAVIOURAL TEST
/// Every method involved is gated on `Firebase.apps.isNotEmpty` and no-ops when
/// Firebase is not initialised, which it never is under `flutter test`. So a
/// call-through test would pass whether or not the calls were there — the worst
/// kind of green. `app_version_test.dart` sets the precedent for reading a
/// source file and asserting an invariant over it; this does the same for a
/// promise that is not merely a bug if broken.
///
/// WHAT IS BEING PROTECTED
/// `site/app/(marketing)/privacy/page.tsx` §6 and `/delete` both state that
/// deleting the account erases the login record — «حساب الدخول (البريد والاسم
/// المعروض)» — and Google Play requires the same of any app offering account
/// creation. The email and display name live in `users/{uid}`, which is a
/// separate document from the `trades` and `watchlist` subcollections. Deleting
/// only the subcollections leaves it behind FOREVER: the rules make that
/// document reachable by its owner alone, and the owner has just been deleted.
///
/// The ordering matters as much as the presence. Both deletes need the caller's
/// own uid to satisfy `isOwner(userId)`, so removing the identity first strands
/// the data permanently.
void main() {
  final source = File(
    'lib/features/auth/repositories/auth_repository.dart',
  ).readAsStringSync();

  /// The body of `deleteAccount`, from the brace that opens it to the one that
  /// closes it.
  ///
  /// The search starts at `) async {` rather than at the signature: the method
  /// takes named parameters, so its parameter list itself ends in `}) async {`
  /// and a naive scan for the next `\n  }` lands there — returning the
  /// signature as the "body" and making all three assertions fail against code
  /// that is perfectly correct.
  String deleteAccountBody() {
    final signature = source.indexOf('Future<void> deleteAccount(');
    expect(
      signature,
      isNot(-1),
      reason: 'deleteAccount was renamed or removed; update this test.',
    );

    final open = source.indexOf(') async {', signature);
    expect(open, isNot(-1), reason: 'could not find the start of the body.');

    final end = source.indexOf('\n  }', open);
    expect(end, isNot(-1), reason: 'could not find the end of deleteAccount.');
    return source.substring(open, end);
  }

  test('deleteAccount erases the profile document, not just the journal', () {
    final body = deleteAccountBody();

    expect(
      body,
      contains('UserProfileService.delete('),
      reason:
          'deleteAccount does not delete users/{uid}. The account and the '
          'journal would go, and a document holding the user\'s email, display '
          'name and activity counters would stay in Firestore permanently — '
          'still listed in the admin dashboard, and unreachable by anyone, '
          'because the rules grant access to its owner alone and the owner has '
          'just been deleted. The privacy policy (section 6) and the /delete '
          'page both promise the login record is erased, and Play requires it.',
    );
  });

  test('the profile is deleted BEFORE the identity', () {
    final body = deleteAccountBody();

    final profile = body.indexOf('UserProfileService.delete(');
    final identity = body.indexOf('FirebaseAuthService.deleteAccount(');

    expect(identity, isNot(-1), reason: 'the identity delete is missing.');
    expect(
      profile,
      lessThan(identity),
      reason:
          'The profile delete must run BEFORE FirebaseAuthService.deleteAccount. '
          'firestore.rules keys users/{uid} to `isOwner(userId)`, so once the '
          'identity is gone there is no credential left that can reach the '
          'document — it would be stranded on the server forever.',
    );
  });

  test('journal data is also deleted before the identity', () {
    final body = deleteAccountBody();

    final data = body.indexOf('FirestoreSyncService.deleteAllData(');
    final identity = body.indexOf('FirebaseAuthService.deleteAccount(');

    expect(data, isNot(-1), reason: 'the journal delete is missing.');
    expect(
      data,
      lessThan(identity),
      reason: 'Same rule as the profile: owner-only access, so data first.',
    );
  });

  test('deleteAllData covers every collection under users/{uid}', () {
    final service = File(
      'lib/features/sync/services/firestore_sync_service.dart',
    ).readAsStringSync();

    final start = service.indexOf('static Future<void> deleteAllData(');
    expect(start, isNot(-1), reason: 'deleteAllData is missing.');
    final body = service.substring(start, service.indexOf('\n  }', start));

    // The loop this asserts on is the ONLY thing standing between a user who
    // asked to be forgotten and a document that outlives them. Every reference
    // helper defined on the class is a collection under users/{uid}; each one
    // must appear here. `settings` was added after this file was written and is
    // the reason the test is not just about trades and watchlist: it holds
    // capital, which is personal financial data the privacy policy §6 promises
    // goes with the account.
    for (final collection in ['_trades(', '_watchlist(', '_settings(']) {
      expect(
        body,
        contains(collection),
        reason:
            '$collection is not in deleteAllData. Whatever it holds would '
            'survive the account and then be unreachable forever — the rules '
            'grant these paths to their owner alone, and the owner is deleted '
            'moments later. If a new subcollection is added to this service, '
            'it belongs in that list and in this test.',
      );
    }
  });

  test('UserProfileService.delete does not swallow its errors', () {
    final service = File(
      'lib/features/sync/services/user_profile_service.dart',
    ).readAsStringSync();

    final start = service.indexOf('static Future<void> delete(');
    expect(start, isNot(-1), reason: 'UserProfileService.delete is missing.');
    final body = service.substring(start, service.indexOf('\n  }', start));

    expect(
      body,
      isNot(contains('catch')),
      reason:
          'delete() must NOT swallow failures the way upsert() and '
          'updateCounts() do. Those cost the operator a counter; this one would '
          'report a successful erasure that did not happen, and then delete the '
          'only credential that could retry it. A throw keeps the account alive '
          'so the user can try again — which is exactly why deleteAllData '
          'throws too.',
    );
  });
}
