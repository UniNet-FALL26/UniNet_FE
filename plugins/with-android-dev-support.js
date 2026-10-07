const { withMainApplication } = require('expo/config-plugins');

module.exports = function withAndroidDevSupport(config) {
  return withMainApplication(config, (config) => {
    const source = config.modResults.contents;
    if (source.includes('useDevSupport = BuildConfig.DEBUG')) return config;

    const hostCall = /(ExpoReactHostFactory\.getDefaultReactHost\(\s*)(context\s*=)/;
    if (config.modResults.language !== 'kt' || !hostCall.test(source)) {
      throw new Error('Expected the Kotlin ExpoReactHostFactory template in MainApplication. Review Android dev support before upgrading.');
    }
    // ReactBuildConfig.DEBUG belongs to the prebuilt RN library, not this app.
    config.modResults.contents = source.replace(hostCall, '$1useDevSupport = BuildConfig.DEBUG,\n      $2');
    return config;
  });
};
