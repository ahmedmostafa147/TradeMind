# R8 rules for the release build.
#
# Most of what this app needs is already covered: the Flutter engine, Firebase
# and Play Services all ship their own consumer rules, and the Hive adapters are
# hand-written rather than reflective, so nothing in lib/ depends on a class
# name surviving. What follows covers the gaps that are not declared upstream.

# Flutter's deferred-components machinery is referenced by the embedding even
# when the app never splits into modules. Without this R8 reports it missing and
# fails the build rather than the app.
-dontwarn io.flutter.embedding.engine.deferredcomponents.**
-dontwarn com.google.android.play.core.**

# Firebase and Firestore models are (de)serialised by name. This app writes its
# own maps rather than annotated POJOs, so this is belt-and-braces against a
# future direct-object write silently losing every field to renaming.
-keepattributes Signature
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.firebase.firestore.PropertyName <fields>;
    @com.google.firebase.firestore.PropertyName <methods>;
}

# Keeps crash reports readable: without it every frame in a Play Console stack
# trace is a single obfuscated letter.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
