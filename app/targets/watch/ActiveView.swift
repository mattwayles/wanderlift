import SwiftUI
import WatchKit

/// The running workout. Two pages: the set (or the rest), and the controls. The crown sets reps on
/// the set page.
struct ActiveView: View {
  let active: WatchActive

  var body: some View {
    TabView {
      Group {
        if active.rest != nil || (active.closing && active.set == nil) {
          RestView(active: active)
        } else if let set = active.set {
          SetView(active: active, set: set)
        } else {
          MessageView(symbol: "hourglass", title: "One moment", detail: "")
        }
      }
      ControlsView(active: active)
    }
    .tabViewStyle(.page)
  }
}

/// The workout clock and heart rate, under whatever else is showing.
struct StatusLine: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let active: WatchActive

  var body: some View {
    HStack(spacing: 10) {
      clock
      if let bpm = model.health.heartRate {
        Label("\(Int(bpm.rounded()))", systemImage: "heart.fill")
          .labelStyle(.titleAndIcon).foregroundStyle(Palette.teal)
      }
    }
    .font(.footnote.monospacedDigit())
    .foregroundStyle(Palette.text2)
  }

  @ViewBuilder private var clock: some View {
    if let frozen = active.pausedElapsedSec {
      Label(formatClock(frozen), systemImage: "pause.fill").labelStyle(.titleAndIcon)
    } else {
      Text(Date(timeIntervalSince1970: active.elapsedAnchorMs / 1000), style: .timer)
    }
  }
}

struct SetView: View {
  let active: WatchActive
  let set: WatchSet

  var body: some View {
    VStack(spacing: 4) {
      Text(set.exerciseName)
        .font(.headline).foregroundStyle(Palette.text)
        .lineLimit(2).minimumScaleFactor(0.7).multilineTextAlignment(.center)
      Text(caption).font(.caption2).foregroundStyle(Palette.text2)
      if set.isHold {
        HoldSetView(set: set).id(set.setKey)
      } else {
        RepsSetView(set: set).id(set.setKey)
      }
      StatusLine(active: active)
    }
    .padding(.horizontal, 4)
  }

  private var caption: String {
    var parts = ["Set \(set.setIndex + 1) of \(set.sets)"]
    if let band = set.band { parts.append(band) }
    return parts.joined(separator: " · ")
  }
}

/// Reps: the crown adjusts what was actually done, starting at the target.
struct RepsSetView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let set: WatchSet
  @State private var reps: Double

  init(set: WatchSet) {
    self.set = set
    _reps = State(initialValue: Double(set.target))
  }

  var body: some View {
    VStack(spacing: 2) {
      Text("\(Int(reps))")
        .font(.system(size: 44, weight: .bold, design: .rounded))
        .foregroundStyle(Palette.text)
        .focusable()
        .digitalCrownRotation($reps, from: 0, through: 99, by: 1, sensitivity: .medium)
      Text("target \(set.target)").font(.caption2).foregroundStyle(Palette.text2)
      Button {
        model.complete(set: set, reps: Int(reps))
      } label: {
        Text("Done").font(.headline).frame(maxWidth: .infinity)
      }
      .tint(Palette.teal)
      .foregroundStyle(Palette.onAccent)
    }
  }
}

/// A hold: the watch runs the countdown (a side at a time for a one-sided hold) and ends the set
/// itself, with a buzz.
struct HoldSetView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let set: WatchSet
  @State private var side = 1
  @State private var endsAt: Date?

  var body: some View {
    VStack(spacing: 4) {
      if let endsAt {
        Text(timerInterval: Date.now...max(Date.now, endsAt), countsDown: true)
          .font(.system(size: 44, weight: .bold, design: .rounded).monospacedDigit())
          .foregroundStyle(Palette.text)
      } else {
        Text("\(set.target)s")
          .font(.system(size: 44, weight: .bold, design: .rounded))
          .foregroundStyle(Palette.text)
      }
      if set.unilateral {
        Text("Side \(side) of 2").font(.caption2).foregroundStyle(Palette.text2)
      }
      if endsAt == nil {
        Button {
          WKInterfaceDevice.current().play(.start)
          endsAt = Date.now.addingTimeInterval(TimeInterval(set.target))
        } label: {
          Text(side == 2 ? "Start side 2" : "Start").font(.headline).frame(maxWidth: .infinity)
        }
        .tint(Palette.teal)
        .foregroundStyle(Palette.onAccent)
      }
    }
    .task(id: endsAt) {
      guard let endsAt else { return }
      let wait = endsAt.timeIntervalSinceNow
      if wait > 0 { try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000)) }
      guard !Task.isCancelled else { return }
      WKInterfaceDevice.current().play(.notification)
      if set.unilateral && side == 1 {
        side = 2
        self.endsAt = nil
      } else {
        model.complete(set: set, seconds: set.target * (set.unilateral ? 2 : 1))
      }
    }
  }
}

/// Between sets: the countdown, ±15s and Skip, and the difficulty question when the phone is
/// asking it.
struct RestView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let active: WatchActive

  var body: some View {
    ScrollView {
      VStack(spacing: 6) {
        if let rest = active.rest {
          Text(timerInterval: rest.range, countsDown: true)
            .font(.system(size: 44, weight: .bold, design: .rounded).monospacedDigit())
            .foregroundStyle(Palette.fern)
            .task(id: rest.endsAtMs) { await buzzAtEnd(of: rest) }
        } else {
          Text("Workout complete").font(.headline).foregroundStyle(Palette.fern)
        }
        if let set = active.set {
          Text("Up next · \(set.exerciseName)")
            .font(.caption).foregroundStyle(Palette.text2)
            .lineLimit(2).multilineTextAlignment(.center)
          Text("Set \(set.setIndex + 1) of \(set.sets)").font(.caption2).foregroundStyle(Palette.text2)
        }
        if active.rest != nil {
          HStack {
            Button("−15") { model.extendRest(by: -15) }
            Button("+15") { model.extendRest(by: 15) }
          }
          .font(.footnote)
          Button("Skip rest") { model.skipRest() }.tint(Palette.fern).foregroundStyle(Palette.onAccent)
        }
        if let feedback = active.feedback {
          FeedbackView(feedback: feedback)
        }
        if active.closing {
          Button("Finish") { Task { await model.stop() } }
            .tint(Palette.teal).foregroundStyle(Palette.onAccent)
        }
        StatusLine(active: active)
      }
      .padding(.horizontal, 4)
    }
  }

  /// A buzz when the rest runs out, so the next set can start without looking.
  private func buzzAtEnd(of rest: WatchRest) async {
    let wait = Date(timeIntervalSince1970: rest.endsAtMs / 1000).timeIntervalSinceNow
    guard wait > 0 else { return }
    try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
    guard !Task.isCancelled else { return }
    WKInterfaceDevice.current().play(.notification)
  }
}

/// "How was the target?" — about the prescription, not the reps logged, so it is always worth
/// answering. Never required.
struct FeedbackView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let feedback: WatchFeedback

  private let options: [(String, String, Color)] = [
    ("too_easy", "Too easy", Palette.fern),
    ("just_right", "Just right", Palette.teal),
    ("too_hard", "Too hard", Palette.summit),
  ]

  var body: some View {
    VStack(spacing: 4) {
      Text(feedback.question).font(.caption2).foregroundStyle(Palette.text2)
        .multilineTextAlignment(.center)
      ForEach(options, id: \.0) { value, label, color in
        Button {
          model.rate(value)
        } label: {
          HStack {
            Text(label).font(.footnote)
            Spacer()
            if feedback.current == value { Image(systemName: "checkmark") }
          }
        }
        .tint(color)
        .foregroundStyle(feedback.current == value ? Palette.onAccent : Palette.text)
      }
    }
  }
}

/// Pause, skip the set, stop. Stop asks first; abandoning a workout is not offered here.
struct ControlsView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let active: WatchActive
  @State private var confirmStop = false

  var body: some View {
    VStack(spacing: 8) {
      Button {
        model.setPaused(!active.paused)
      } label: {
        Label(active.paused ? "Resume" : "Pause", systemImage: active.paused ? "play.fill" : "pause.fill")
          .frame(maxWidth: .infinity)
      }
      .tint(Palette.teal)
      .foregroundStyle(Palette.onAccent)
      if let set = active.set, active.rest == nil {
        Button("Skip set") { model.skip(set: set) }
      }
      Button("End workout") { confirmStop = true }
        .confirmationDialog("End this workout?", isPresented: $confirmStop) {
          Button("End workout") { Task { await model.stop() } }
          Button("Keep going", role: .cancel) {}
        }
    }
    .padding(.horizontal, 4)
  }
}
