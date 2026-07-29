/// The app's version, as reported to the operator dashboard.
///
/// A hand-written constant rather than package_info_plus: the only consumer is
/// one field on a telemetry document, which does not justify a platform
/// channel and a native dependency on every build.
///
/// The obvious failure of a hand-written constant is drift — pubspec.yaml gets
/// bumped for a release and this does not, and from then on every user reports
/// a version that shipped months ago. `test/app_version_test.dart` parses
/// pubspec.yaml and fails if the two disagree, so the drift cannot survive a
/// test run.
const String kAppVersion = '1.0.0';
