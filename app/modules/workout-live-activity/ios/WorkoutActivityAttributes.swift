import ActivityKit
import Foundation

/// The active workout's Live Activity (Dynamic Island and Lock Screen).
///
/// This file exists twice, byte for byte: in the `workout-live-activity` Expo module, which starts
/// and updates the activity, and in the `workout-activity` widget target, which draws it. ActivityKit
/// pairs the two by this type, so the copies must never drift; `liveActivityAttributes.test.ts`
/// fails if they do.
///
/// Display only. Every clock in here is an instant the widget counts from or to on its own
/// (`Text(timerInterval:)`), so the app sends an update when something changes, never per second.
struct WorkoutActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// The exercise on deck: the one being done, or the one up next while resting.
    var exerciseName: String
    /// "Set 2 of 4" for that exercise.
    var setLabel: String
    /// True between sets.
    var resting: Bool
    /// The elapsed workout clock counts up from here (start plus time spent paused).
    var elapsedAnchor: Date
    /// While paused: the elapsed seconds to show, frozen. Nil while the clock is running.
    var pausedElapsedSec: Int?
    /// The current rest's window, while resting.
    var restStartedAt: Date?
    var restEndsAt: Date?
    /// Completed sets over planned sets, 0...1.
    var progress: Double
  }

  /// Which session this activity belongs to, so a stale one can be found and ended.
  var sessionId: String
  /// "Upper · Medium", fixed for the life of the activity.
  var title: String
}
