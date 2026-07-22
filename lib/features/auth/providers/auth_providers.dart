import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce/hive.dart';

import '../models/user_account.dart';
import '../repositories/auth_repository.dart';

final authBoxProvider = Provider<Box>((ref) {
  throw UnimplementedError('authBoxProvider must be overridden in main()');
});

final authProvider = NotifierProvider<AuthRepository, UserAccount>(() {
  throw UnimplementedError('authProvider must be overridden with Box');
});
