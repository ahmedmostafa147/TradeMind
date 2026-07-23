import 'package:firebase_auth/firebase_auth.dart';

/// Firebase Authentication service wrapper.
class FirebaseAuthService {
  static FirebaseAuth get _auth => FirebaseAuth.instance;

  static User? get currentUser => _auth.currentUser;

  static Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Sign up user with Email and Password.
  static Future<UserCredential?> signUp({
    required String email,
    required String password,
    required String displayName,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      if (credential.user != null) {
        await credential.user!.updateDisplayName(displayName);
      }
      return credential;
    } on FirebaseAuthException catch (e) {
      throw e.message ?? 'حدث خطأ أثناء إنشاء الحساب';
    } catch (e) {
      throw 'تعذّر الاتصال بخدمة الحسابات: $e';
    }
  }

  /// Sign in user with Email and Password.
  static Future<UserCredential?> signIn({
    required String email,
    required String password,
  }) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw e.message ?? 'اسم المستخدم أو كلمة السر غير صحيحة';
    } catch (e) {
      throw 'تعذّر تسجيل الدخول: $e';
    }
  }

  /// Sign out current user.
  static Future<void> signOut() async {
    try {
      await _auth.signOut();
    } catch (_) {}
  }
}
