import 'package:flutter/foundation.dart';

/// «مين اشترى ومين باع» — the EGX investor-flow split for one session.
///
/// MIRROR OF site/lib/market-flows.ts and site/lib/market-flows-store.ts. The
/// documents are written by the admin's browser into `marketFlows/{YYYY-MM-DD}`
/// and read here, so the two decoders must accept exactly the same shape.
///
/// The app is READ-ONLY on this collection. firestore.rules grants writes to
/// members of `admins`, which no client path can join.
enum Nationality {
  egyptian,
  arab,
  foreign;

  String get key => name;

  String get label => switch (this) {
    Nationality.egyptian => 'مصريين',
    Nationality.arab => 'عرب',
    Nationality.foreign => 'أجانب',
  };
}

enum InvestorClass {
  all,
  institutions,
  individuals;

  String get key => name;

  String get label => switch (this) {
    InvestorClass.all => 'الكل',
    InvestorClass.institutions => 'مؤسسات',
    InvestorClass.individuals => 'أفراد',
  };
}

@immutable
class FlowRow {
  final double bought;
  final double sold;

  /// Positive means a net buyer. Stored rather than derived, because the web
  /// takes it from the exchange's own column when scraping — see the note in
  /// market-flows.ts about why the column order is read and never assumed.
  final double net;

  const FlowRow({
    required this.bought,
    required this.sold,
    required this.net,
  });

  static FlowRow? fromMap(Object? value) {
    if (value is! Map) return null;
    final bought = _toDouble(value['bought']);
    final sold = _toDouble(value['sold']);
    final net = _toDouble(value['net']);
    if (bought == null || sold == null || net == null) return null;
    return FlowRow(bought: bought, sold: sold, net: net);
  }
}

@immutable
class MarketFlows {
  /// Session date, YYYY-MM-DD — also the document id.
  final String date;
  final Map<InvestorClass, Map<Nationality, FlowRow>> tables;

  const MarketFlows({required this.date, required this.tables});

  Map<Nationality, FlowRow> table(InvestorClass which) => tables[which]!;

  /// Rebuilds from a Firestore document, or returns null.
  ///
  /// A PARTIAL SESSION IS REJECTED WHOLE. These figures are rendered as money
  /// with a direction, and a missing nationality that defaulted to zero would
  /// read as «الأجانب ما اشتروش النهاردة» — a confident statement about the
  /// market that nobody made.
  static MarketFlows? fromMap(Map<String, dynamic> map) {
    final date = map['date'];
    if (date is! String || date.isEmpty) return null;

    final tables = <InvestorClass, Map<Nationality, FlowRow>>{};
    for (final cls in InvestorClass.values) {
      final raw = map[cls.key];
      if (raw is! Map) return null;

      final rows = <Nationality, FlowRow>{};
      for (final nationality in Nationality.values) {
        final row = FlowRow.fromMap(raw[nationality.key]);
        if (row == null) return null;
        rows[nationality] = row;
      }
      tables[cls] = rows;
    }

    return MarketFlows(date: date, tables: tables);
  }
}

/// Firestore hands back `int` for a whole number and `double` otherwise, and
/// the two SDKs disagree about which — the same trap firestore.rules documents
/// for `waitingThresholdDays`.
double? _toDouble(Object? value) {
  if (value is num) return value.toDouble();
  return null;
}

/// Newest first. Document ids are YYYY-MM-DD, which sorts chronologically as a
/// string, so no date parsing is needed to order them.
List<MarketFlows> sortSessions(List<MarketFlows> sessions) {
  final sorted = [...sessions]..sort((a, b) => b.date.compareTo(a.date));
  return List.unmodifiable(sorted);
}
