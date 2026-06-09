const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = 'withReleaseSigning.js';

/** Firma release con keystore fijo en credentials/ para permitir actualizar sin desinstalar. */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') return config;
    if (config.modResults.contents.includes(MARKER)) return config;

    config.modResults.contents = config.modResults.contents.replace(
      /signingConfigs \{\s*debug \{[\s\S]*?\}\s*\}/,
      `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // @generated ${MARKER}
            storeFile file('../../credentials/android-release.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`,
    );

    config.modResults.contents = config.modResults.contents.replace(
      /(buildTypes \{\s*release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    );

    return config;
  });
};
