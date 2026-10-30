/**
 * The watch-face complication: a launcher. Tapping it opens the watch app; it shows nothing of the
 * workout, so it needs no shared storage and no reload from the app. Prebuild links this folder
 * into the Xcode project as a watchOS WidgetKit extension embedded in the watch app
 * (@bacons/apple-targets).
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'watch-widget',
  name: 'WatchComplication',
  displayName: 'Wanderlift',
  frameworks: ['SwiftUI', 'WidgetKit'],
  deploymentTarget: '10.0',
  bundleIdentifier: '.watchkitapp.complication',
};
