plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.trademind.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // Google Play's permanent identity for the app, and the `package_name`
        // that google-services.json must carry EXACTLY. Kept identical to
        // `namespace` above and to MainActivity's Kotlin package — when those
        // three drift, the manifest's relative `.MainActivity` resolves against
        // the namespace and the app dies at launch with ClassNotFoundException.
        applicationId = "com.trademind.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

// Applied only when the config file exists.
//
// The google-services plugin fails the build outright with "File
// google-services.json is missing" when it is absent, which would leave the
// project unbuildable for anyone who has not set Firebase up yet. Guarding it
// keeps the app building and offline-capable today, and turns Firebase on the
// moment the file is dropped into android/app/ — no edit here required.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
} else {
    logger.warn(
        "google-services.json not found in android/app/ — building WITHOUT " +
            "Firebase. Account sign-in and cloud backup will be unavailable."
    )
}
