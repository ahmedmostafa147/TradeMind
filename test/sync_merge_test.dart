import 'package:flutter_test/flutter_test.dart';

import 'package:egx_trade_journal/features/sync/services/sync_merge.dart';

void main() {
  group('decideFor', () {
    test('absent everywhere is nothing to do', () {
      expect(decideFor(const RecordState()), SyncAction.none);
    });

    test('cloud only comes down — the reinstall case', () {
      expect(
        decideFor(const RecordState(remote: 'a')),
        SyncAction.adoptRemote,
      );
    });

    test('device only goes up — the new-trade case', () {
      expect(decideFor(const RecordState(local: 'a')), SyncAction.pushLocal);
    });

    test('identical content on both sides does nothing', () {
      expect(
        decideFor(
          const RecordState(local: 'a', lastSynced: 'a', remote: 'a'),
        ),
        SyncAction.none,
      );
    });

    test('no ancestor but identical content still does nothing', () {
      expect(
        decideFor(const RecordState(local: 'a', remote: 'a')),
        SyncAction.none,
      );
    });

    test('edited here only, uploads', () {
      expect(
        decideFor(
          const RecordState(local: 'b', lastSynced: 'a', remote: 'a'),
        ),
        SyncAction.pushLocal,
      );
    });

    test('edited in the browser only, comes down', () {
      // THE BUG THIS EXISTS FOR. restore() used to skip any id it already had,
      // so a trade edited on the web never reached the phone at all.
      expect(
        decideFor(
          const RecordState(local: 'a', lastSynced: 'a', remote: 'b'),
        ),
        SyncAction.adoptRemote,
      );
    });

    test('edited on both sides keeps the local copy', () {
      expect(
        decideFor(
          const RecordState(local: 'b', lastSynced: 'a', remote: 'c'),
        ),
        SyncAction.pushLocal,
      );
    });

    test('differing with no ancestor keeps the local copy', () {
      expect(
        decideFor(const RecordState(local: 'b', remote: 'c')),
        SyncAction.pushLocal,
      );
    });

    test('a record deleted locally but still in the cloud comes back', () {
      // Documented, not desired: a delete and a device that never had the
      // record look identical without tombstones.
      expect(
        decideFor(const RecordState(lastSynced: 'a', remote: 'a')),
        SyncAction.adoptRemote,
      );
    });
  });

  group('fingerprint', () {
    test('key order does not change the digest', () {
      expect(
        fingerprint({'b': 1, 'a': 2}),
        fingerprint({'a': 2, 'b': 1}),
      );
    });

    test('updatedAt is excluded at every level', () {
      // Written fresh on every push, so counting it would make every uploaded
      // record differ from its local twin the moment it landed.
      expect(
        fingerprint({'id': 'x', 'updatedAt': 111}),
        fingerprint({'id': 'x', 'updatedAt': 999}),
      );
      expect(
        fingerprint({'id': 'x'}),
        fingerprint({'id': 'x', 'updatedAt': 1}),
      );
    });

    test('a real field change does change the digest', () {
      expect(
        fingerprint({'id': 'x', 'entryPrice': 10}),
        isNot(fingerprint({'id': 'x', 'entryPrice': 11})),
      );
    });

    test('null is distinct from absent-in-value, and from an empty string', () {
      expect(
        fingerprint({'notes': null}),
        isNot(fingerprint({'notes': ''})),
      );
    });

    test('list order is preserved — a timeline is a sequence', () {
      expect(
        fingerprint([1, 2]),
        isNot(fingerprint([2, 1])),
      );
    });

    test('nested maps are sorted too', () {
      expect(
        fingerprint({
          'timeline': [
            {'text': 'a', 'date': '1'},
          ],
        }),
        fingerprint({
          'timeline': [
            {'date': '1', 'text': 'a'},
          ],
        }),
      );
    });
  });

  group('planSync', () {
    test('sorts a mixed collection into the two buckets', () {
      final plan = planSync(
        local: {
          'same': 'x',
          'editedHere': 'new',
          'onlyHere': 'y',
          'editedThere': 'old',
        },
        lastSynced: {
          'same': 'x',
          'editedHere': 'old',
          'editedThere': 'old',
        },
        remote: {
          'same': 'x',
          'editedHere': 'old',
          'editedThere': 'new',
          'onlyThere': 'z',
        },
      );

      expect(plan.adopt, {'editedThere', 'onlyThere'});
      expect(plan.push, {'editedHere', 'onlyHere'});
    });

    test('an id is never in both buckets', () {
      final plan = planSync(
        local: {'a': '1', 'b': '2'},
        lastSynced: {'a': '0'},
        remote: {'a': '9', 'b': '2'},
      );
      expect(plan.adopt.intersection(plan.push), isEmpty);
    });

    test('everything in step is an empty plan', () {
      final plan = planSync(
        local: {'a': '1'},
        lastSynced: {'a': '1'},
        remote: {'a': '1'},
      );
      expect(plan.isEmpty, isTrue);
    });

    test('a first sync with matching content pushes nothing', () {
      // Two surfaces that already agree must not generate write traffic just
      // because this device has no memory of syncing them.
      final plan = planSync(
        local: {'a': '1', 'b': '2'},
        lastSynced: const {},
        remote: {'a': '1', 'b': '2'},
      );
      expect(plan.isEmpty, isTrue);
    });
  });
}
