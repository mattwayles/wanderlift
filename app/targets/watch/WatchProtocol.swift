import Foundation

/// What the phone tells the watch, and what the watch asks of the phone. The Swift copy of
/// `src/lib/watchProtocol.ts`: `watchProtocol.test.ts` fails if a field is added to one and not the
/// other. Instants are epoch milliseconds.
let watchProtocolVersion = 1

struct WatchSet: Codable, Equatable {
  var setKey: String
  var exerciseName: String
  var setIndex: Int
  var sets: Int
  /// "reps" counts reps; "hold" runs a countdown of `target` seconds.
  var kind: String
  var target: Int
  var unilateral: Bool
  var band: String?
  /// "per side" or "total, both sides" when what a rep counts needs saying.
  var repBasis: String?

  var isHold: Bool { kind == "hold" }
}

struct WatchRest: Codable, Equatable {
  var startedAtMs: Double
  var endsAtMs: Double

  var range: ClosedRange<Date> {
    let start = Date(timeIntervalSince1970: startedAtMs / 1000)
    let end = Date(timeIntervalSince1970: endsAtMs / 1000)
    return start...max(start, end)
  }
}

/// The phone's hold timer for a timed set. The phone owns the clock; the watch shows it.
struct WatchHold: Codable, Equatable {
  var setKey: String
  /// "ready", "getReady", "side" or "switch".
  var phase: String
  var side: Int
  var durationSec: Int
  var endsAtMs: Double?
  /// Seconds left while paused, else nil.
  var remainingSec: Int?

  var endsAt: Date? { endsAtMs.map { Date(timeIntervalSince1970: $0 / 1000) } }
}

struct WatchFeedback: Codable, Equatable {
  var question: String
  /// "too_easy", "just_right", "too_hard" or nil.
  var current: String?
  var neverAgainDone: Bool
}

struct WatchActive: Codable, Equatable {
  var sessionId: String
  var title: String
  var paused: Bool
  var elapsedAnchorMs: Double
  var pausedElapsedSec: Int?
  var progress: Double
  var set: WatchSet?
  var rest: WatchRest?
  var hold: WatchHold?
  var feedback: WatchFeedback?
  var closing: Bool
}

struct WatchReady: Codable, Equatable {
  var sessionId: String
  var title: String
  var exerciseCount: Int
  var minutes: Int
  var resuming: Bool
}

struct WatchState: Codable, Equatable {
  var v: Int
  var rev: Double
  /// "idle", "ready" or "active".
  var mode: String
  var ready: WatchReady?
  var active: WatchActive?

  static let idle = WatchState(v: watchProtocolVersion, rev: 0, mode: "idle", ready: nil, active: nil)
}

/// One command to the phone. Optional fields are only encoded when set.
struct WatchCommand: Codable {
  var v: Int = watchProtocolVersion
  var id: String = UUID().uuidString
  var atMs: Double = Date().timeIntervalSince1970 * 1000
  var type: String
  var sessionId: String
  var setKey: String?
  var reps: Int?
  var seconds: Int?
  var deltaSec: Int?
  var difficulty: String?
  var healthSaved: Bool?
}
