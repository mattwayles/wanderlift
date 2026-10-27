/**
 * The active workout's Live Activity: the Dynamic Island and the Lock Screen banner. Display only;
 * the app starts and updates it through modules/workout-live-activity. Prebuild links this folder
 * into the Xcode project as a WidgetKit extension (@bacons/apple-targets).
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: 'widget',
  name: 'WorkoutActivity',
  displayName: 'Wanderlift Workout',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  // The app's own floor (ios/ deployment target); Live Activities need 16.1.
  deploymentTarget: '16.4',
  bundleIdentifier: '.workoutactivity',
};
