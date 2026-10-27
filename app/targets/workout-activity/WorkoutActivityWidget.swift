import ActivityKit
import SwiftUI
import WidgetKit

/// The active workout on the Dynamic Island and the Lock Screen. Display only: no buttons, and no
/// clock that needs the app — every timer here counts by itself from the instants in the state,
/// so the app updates the activity only when something changes (a set, a rest, a pause).
///
/// Midnight colours throughout (palettes.ts): the Island is always black and the Lock Screen banner
/// sits on its own dark tint, so there is no light variant to follow. Teal while training, fern
/// while resting, the same split as the workout screen's hero card.
@main
struct WorkoutActivityBundle: WidgetBundle {
  var body: some Widget {
    WorkoutLiveActivity()
  }
}

private enum Palette {
  static let bg = Color(hex: 0x0B0E13)
  static let text = Color(hex: 0xF7F3EA)
  static let text2 = Color(hex: 0xB4BCC8)
  static let teal = Color(hex: 0x4FB8C4)
  static let fern = Color(hex: 0x68CF59)
  static let track = Color(hex: 0x263042)

  static func accent(_ state: WorkoutActivityAttributes.ContentState) -> Color {
    state.resting ? fern : teal
  }
}

private extension Color {
  init(hex: UInt32) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255
    )
  }
}

private extension WorkoutActivityAttributes.ContentState {
  /// A valid range for the rest clocks even if the end arrives before the start (a Skip).
  var restRange: ClosedRange<Date>? {
    guard resting, let start = restStartedAt, let end = restEndsAt else { return nil }
    return start...max(start, end)
  }

  var paused: Bool { pausedElapsedSec != nil }

  var symbol: String {
    if resting { return "timer" }
    if paused { return "pause.fill" }
    return "figure.strengthtraining.functional"
  }
}

/// "12:05" or "1:02:05" — the frozen elapsed number while paused, laid out like the live timer.
private func clockText(_ seconds: Int) -> String {
  let h = seconds / 3600
  let m = (seconds % 3600) / 60
  let s = seconds % 60
  return h > 0
    ? String(format: "%d:%02d:%02d", h, m, s)
    : String(format: "%d:%02d", m, s)
}

/// The elapsed workout clock: counting up from the anchor, or frozen while paused.
private struct ElapsedClock: View {
  let state: WorkoutActivityAttributes.ContentState

  var body: some View {
    if let frozen = state.pausedElapsedSec {
      Text(clockText(frozen))
    } else {
      Text(timerInterval: state.elapsedAnchor...Date.distantFuture, countsDown: false)
    }
  }
}

/// The rest countdown while resting, the elapsed clock otherwise.
private struct PhaseClock: View {
  let state: WorkoutActivityAttributes.ContentState

  var body: some View {
    if let range = state.restRange {
      Text(timerInterval: range, countsDown: true)
    } else {
      ElapsedClock(state: state)
    }
  }
}

/// Rest: the countdown draining. Training: completed sets over the plan.
private struct PhaseBar: View {
  let state: WorkoutActivityAttributes.ContentState

  var body: some View {
    Group {
      if let range = state.restRange {
        ProgressView(timerInterval: range, countsDown: true) {
          EmptyView()
        } currentValueLabel: {
          EmptyView()
        }
      } else {
        ProgressView(value: state.progress)
      }
    }
    .progressViewStyle(.linear)
    .tint(Palette.accent(state))
    .background(Palette.track.clipShape(Capsule()))
  }
}

/// "Rest" with the exercise up next under it, or the exercise and its set.
private struct Headline: View {
  let state: WorkoutActivityAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(state.resting ? "Rest" : state.exerciseName)
        .font(.headline)
        .foregroundColor(Palette.text)
        .lineLimit(1)
      Text(state.resting ? "Up next · \(state.exerciseName)" : state.setLabel)
        .font(.subheadline)
        .foregroundColor(Palette.text2)
        .lineLimit(1)
    }
  }
}

private struct LockScreenView: View {
  let context: ActivityViewContext<WorkoutActivityAttributes>

  var body: some View {
    let state = context.state
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 4) {
          Label(context.attributes.title, systemImage: state.symbol)
            .font(.caption)
            .foregroundColor(Palette.accent(state))
          Headline(state: state)
        }
        Spacer(minLength: 12)
        VStack(alignment: .trailing, spacing: 2) {
          PhaseClock(state: state)
            .font(.system(.title, design: .rounded).weight(.semibold))
            .monospacedDigit()
            .foregroundColor(Palette.text)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 120, alignment: .trailing)
          Group {
            if state.resting {
              // The workout clock keeps going under the rest, so it is still shown, smaller.
              ElapsedClock(state: state)
            } else if state.paused {
              Text("Paused")
            } else {
              Text(state.setLabel).hidden()
            }
          }
          .font(.caption)
          .monospacedDigit()
          .foregroundColor(Palette.text2)
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 120, alignment: .trailing)
        }
      }
      PhaseBar(state: state)
    }
    .padding(16)
  }
}

struct WorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(Palette.bg)
        .activitySystemActionForegroundColor(Palette.text)
    } dynamicIsland: { context in
      let state = context.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image(systemName: state.symbol)
            .font(.title2)
            .foregroundColor(Palette.accent(state))
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          PhaseClock(state: state)
            .font(.system(.title2, design: .rounded).weight(.semibold))
            .monospacedDigit()
            .foregroundColor(Palette.text)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 96, alignment: .trailing)
        }
        DynamicIslandExpandedRegion(.center) {
          Headline(state: state)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        DynamicIslandExpandedRegion(.bottom) {
          PhaseBar(state: state)
            .padding(.horizontal, 4)
            .padding(.top, 6)
        }
      } compactLeading: {
        Image(systemName: state.symbol)
          .foregroundColor(Palette.accent(state))
      } compactTrailing: {
        // A timer Text claims all the width it is offered; the fixed frame keeps the pill compact.
        PhaseClock(state: state)
          .monospacedDigit()
          .foregroundColor(Palette.accent(state))
          .multilineTextAlignment(.trailing)
          .frame(width: 44)
      } minimal: {
        Image(systemName: state.symbol)
          .foregroundColor(Palette.accent(state))
      }
      .keylineTint(Palette.accent(state))
    }
  }
}
