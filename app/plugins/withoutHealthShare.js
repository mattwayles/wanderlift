const { withInfoPlist } = require('@expo/config-plugins');

/**
 * `@kingstinct/react-native-healthkit`'s plugin always writes `NSHealthShareUsageDescription`
 * (falling back to "wants to read your health data"), even though the app only writes to Health
 * and never requests read access. An unused read purpose string invites an App Review question,
 * so this strips it. List it BEFORE the HealthKit plugin in `app.json`: mods run in reverse
 * registration order, so that makes this one run after.
 */
module.exports = (config) =>
  withInfoPlist(config, (c) => {
    delete c.modResults.NSHealthShareUsageDescription;
    return c;
  });
