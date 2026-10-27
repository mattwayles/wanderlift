import ActivityKit
import ExpoModulesCore
import Foundation

/// Starts, updates and ends the active workout's Live Activity (see `WorkoutActivityAttributes`).
/// Updates are local only: no push token is requested, because there is no server to send one to.
///
/// At most one workout activity exists at a time. Starting one for a session ends any left over
/// from another (a workout abandoned while the app was killed, say).
///
/// Nothing here throws into JS. Live Activities switched off, unsupported, or refused by the
/// system all come back as `false` from `start`/`update`, and the workout carries on regardless.
struct ContentStateRecord: Record {
  @Field var exerciseName: String = ""
  @Field var setLabel: String = ""
  @Field var resting: Bool = false
  /// Epoch milliseconds, like every instant JS sends.
  @Field var elapsedAnchorMs: Double = 0
  @Field var pausedElapsedSec: Int? = nil
  @Field var restStartedAtMs: Double? = nil
  @Field var restEndsAtMs: Double? = nil
  @Field var progress: Double = 0

  var contentState: WorkoutActivityAttributes.ContentState {
    WorkoutActivityAttributes.ContentState(
      exerciseName: exerciseName,
      setLabel: setLabel,
      resting: resting,
      elapsedAnchor: date(elapsedAnchorMs),
      pausedElapsedSec: pausedElapsedSec,
      restStartedAt: restStartedAtMs.map(date),
      restEndsAt: restEndsAtMs.map(date),
      progress: min(1, max(0, progress))
    )
  }
}

private func date(_ ms: Double) -> Date {
  Date(timeIntervalSince1970: ms / 1000)
}

private func content(_ state: ContentStateRecord) -> ActivityContent<WorkoutActivityAttributes.ContentState> {
  ActivityContent(state: state.contentState, staleDate: nil)
}

private func activities() -> [Activity<WorkoutActivityAttributes>] {
  Activity<WorkoutActivityAttributes>.activities
}

public class WorkoutLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WorkoutLiveActivity")

    /// Whether the user allows Live Activities for this app right now.
    Function("areEnabled") { () -> Bool in
      ActivityAuthorizationInfo().areActivitiesEnabled
    }

    /// Session ids of the workout activities currently running.
    Function("activeSessionIds") { () -> [String] in
      activities().map { $0.attributes.sessionId }
    }

    /// Shows the workout, or updates it if this session's activity is already up.
    AsyncFunction("start") { (sessionId: String, title: String, state: ContentStateRecord) async -> Bool in
      for activity in activities() where activity.attributes.sessionId != sessionId {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      if let existing = activities().first(where: { $0.attributes.sessionId == sessionId }) {
        await existing.update(content(state))
        return true
      }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
      do {
        _ = try Activity.request(
          attributes: WorkoutActivityAttributes(sessionId: sessionId, title: title),
          content: content(state),
          pushType: nil
        )
        return true
      } catch {
        return false
      }
    }

    /// Replaces the shown state. False if this session has no activity (it was dismissed, or
    /// never started).
    AsyncFunction("update") { (sessionId: String, state: ContentStateRecord) async -> Bool in
      guard let activity = activities().first(where: { $0.attributes.sessionId == sessionId }) else {
        return false
      }
      await activity.update(content(state))
      return true
    }

    /// Ends this session's activity, or every workout activity when `sessionId` is nil. Gone at
    /// once: a finished or abandoned workout has nothing left worth keeping on the Lock Screen.
    AsyncFunction("end") { (sessionId: String?) async in
      for activity in activities() where sessionId == nil || activity.attributes.sessionId == sessionId {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}
