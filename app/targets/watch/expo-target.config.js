/**
 * The Apple Watch companion: start, track and stop a workout from the wrist. The phone stays the
 * source of truth (src/lib/workoutWatch.ts); the watch mirrors its state and sends commands, and
 * runs the HealthKit workout session that keeps it alive on the wrist and reads heart rate.
 * Prebuild links this folder into the Xcode project as a watchOS app (@bacons/apple-targets).
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'watch',
  name: 'Watch',
  displayName: 'Wanderlift',
  frameworks: ['SwiftUI', 'WatchConnectivity', 'HealthKit', 'WatchKit'],
  deploymentTarget: '10.0',
  bundleIdentifier: '.watchkitapp',
  // App Store Connect rejects a watch app with no icon (ITMS-90391/90713); the phone's icon, which
  // the plugin writes into the target's asset catalog as its AppIcon.
  icon: '../../assets/icon.png',
  entitlements: {
    'com.apple.developer.healthkit': true,
    'com.apple.developer.healthkit.access': [],
  },
};
