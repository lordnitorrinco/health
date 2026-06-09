const {
  withAppBuildGradle,
  withGradleProperties,
  withProjectBuildGradle,
} = require('@expo/config-plugins');

const MARKER = 'withAndroidBuild.js';

function upsertProperty(items, key, value) {
  const idx = items.findIndex((item) => item.type === 'property' && item.key === key);
  if (idx >= 0) items[idx].value = value;
  else items.push({ type: 'property', key, value });
}

function stripGeneratedBlock(contents) {
  let out = contents;
  while (out.includes(MARKER)) {
    const markerIdx = out.indexOf(MARKER);
    const start = out.lastIndexOf('// @generated', markerIdx);
    if (start < 0) break;
    out = out.slice(0, start).trimEnd() + '\n';
  }
  return out;
}

function withGradleQuiet(config) {
  return withGradleProperties(config, (config) => {
    upsertProperty(config.modResults, 'org.gradle.warning.mode', 'none');
    upsertProperty(config.modResults, 'org.gradle.problems.report', 'false');
    upsertProperty(config.modResults, 'org.gradle.console', 'plain');
    upsertProperty(config.modResults, 'org.gradle.logging.level', 'warn');
    upsertProperty(config.modResults, 'EX_DEV_CLIENT_NETWORK_INSPECTOR', 'false');
    return config;
  });
}

function withRootGradle(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;

    config.modResults.contents = stripGeneratedBlock(config.modResults.contents);
    config.modResults.contents += `
// @generated ${MARKER}
subprojects { subproject ->
    subproject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        compilerOptions {
            suppressWarnings = true
        }
    }
    subproject.tasks.withType(JavaCompile).configureEach {
        options.compilerArgs.addAll(["-Xlint:none", "-nowarn"])
        options.deprecation = false
        options.warnings = false
        logging.captureStandardOutput(LogLevel.ERROR)
        logging.captureStandardError(LogLevel.ERROR)
    }
    subproject.plugins.withId("com.android.application") {
        subproject.android {
            defaultConfig {
                externalNativeBuild {
                    cmake {
                        cppFlags "-Wno-deprecated-declarations"
                    }
                }
            }
        }
    }
    subproject.plugins.withId("com.android.library") {
        subproject.android {
            defaultConfig {
                externalNativeBuild {
                    cmake {
                        cppFlags "-Wno-deprecated-declarations"
                    }
                }
            }
        }
    }
}

gradle.projectsEvaluated {
    tasks.matching { it.name.contains("process") && it.name.contains("Manifest") }.configureEach {
        logging.captureStandardOutput(LogLevel.ERROR)
        logging.captureStandardError(LogLevel.ERROR)
    }
}
`;
    return config;
  });
}

function withAppGradle(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;

    config.modResults.contents = stripGeneratedBlock(config.modResults.contents);
    config.modResults.contents += `
// @generated ${MARKER}
tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions {
        suppressWarnings = true
    }
}
`;
    return config;
  });
}

function withReactBundleArgs(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    if (!config.modResults.contents.includes('extraPackagerArgs')) {
      config.modResults.contents = config.modResults.contents.replace(
        'bundleCommand = "export:embed"',
        'bundleCommand = "export:embed"\n    extraPackagerArgs = ["--read-global-cache"]',
      );
    }
    return config;
  });
}

module.exports = function withAndroidBuild(config) {
  config = withGradleQuiet(config);
  config = withRootGradle(config);
  config = withAppGradle(config);
  config = withReactBundleArgs(config);
  return config;
};
