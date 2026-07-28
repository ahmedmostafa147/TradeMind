import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Upload-key credentials, kept OUT of the repository — android/.gitignore
// excludes both this file and *.jks. Play ties the app to the first key it
// ever sees, so losing it means never updating this listing again: back the
// .jks up somewhere that is not this machine.
//
// See android/key.properties.example for the four keys, and RELEASE.md for how
// to generate the keystore.
val keystoreProperties = Properties().apply {
    val file = rootProject.file("key.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val hasReleaseKey = keystoreProperties.getProperty("storeFile") != null

android {
    namespace = "com.radar.eg"
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
        applicationId = "com.radar.eg"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // Falls back to the debug key so `flutter run --release` still works
            // on a machine without the keystore. Play rejects a debug-signed
            // upload outright, so this cannot ship by accident — but the warning
            // below is there so it is never a surprise either.
            signingConfig = if (hasReleaseKey) {
                signingConfigs.getByName("release")
            } else {
                logger.warn(
                    "key.properties not found in android/ — the release build " +
                        "is signed with the DEBUG key and CANNOT be uploaded to " +
                        "Google Play. See RELEASE.md."
                )
                signingConfigs.getByName("debug")
            }

            // R8: strips unused code and resources. Worth roughly a third of the
            // download size here, most of it unused Firebase and Play Services
            // classes pulled in by google_sign_in.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
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
