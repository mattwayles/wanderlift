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
        HoldSetView(set: set, hold: active.hold).id(set.setKey)
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
      .buttonStyle(.primaryTeal)
    }
  }
}

/// A hold. The phone runs the clock (and its 3-2-1 beeps, which are what reach the user's
/// headphones); the watch shows it. Before it starts the crown sets the length in 5s steps and Start
/// asks the phone to begin. The taps for the last seconds and the end are `WatchCues`.
struct HoldSetView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let set: WatchSet
  let hold: WatchHold?
  @State private var seconds: Double
  /// The length the phone was last told, so each crown step sends only what changed.
  @State private var sent: Int
  @State private var lastTurn = Date.distantPast

  init(set: WatchSet, hold: WatchHold?) {
    self.set = set
    self.hold = hold
    let start = hold?.durationSec ?? set.target
    _seconds = State(initialValue: Double(start))
    _sent = State(initialValue: start)
  }

  private var phase: String { hold?.phase ?? "ready" }

  var body: some View {
    VStack(spacing: 4) {
      clock
      if set.unilateral {
        Text(sideLine).font(.caption2).foregroundStyle(Palette.text2)
      }
      if phase == "ready" {
        Button {
          model.startHold(set: set)
        } label: {
          Text("Start").font(.headline)
        }
        .buttonStyle(.primaryTeal)
      }
    }
  }

  private var sideLine: String {
    switch phase {
    case "switch": return "Switch sides"
    case "ready": return "per side"
    default: return "Side \(hold?.side ?? 1) of 2"
    }
  }

  @ViewBuilder private var clock: some View {
    if phase == "ready" {
      Text("\(Int(seconds))s")
        .font(.system(size: 44, weight: .bold, design: .rounded))
        .foregroundStyle(Palette.text)
        .focusable()
        .digitalCrownRotation($seconds, from: 5, through: 900, by: 5, sensitivity: .medium)
        .onChange(of: seconds) { _, new in
          lastTurn = Date()
          let step = Int(new) - sent
          guard step != 0 else { return }
          sent = Int(new)
          model.adjustHold(set: set, by: step)
        }
        // The phone's own ±5s buttons move the length too; take its value once the crown has been
        // still for a moment, so a late echo of an earlier step does not pull the number back.
        .onChange(of: hold?.durationSec) { _, new in
          guard let new, Date().timeIntervalSince(lastTurn) > 1.5, new != Int(seconds) else { return }
          seconds = Double(new)
          sent = new
        }
    } else if let frozen = hold?.remainingSec {
      Label("\(frozen)", systemImage: "pause.fill")
        .labelStyle(.titleAndIcon)
        .font(.system(size: 44, weight: .bold, design: .rounded).monospacedDigit())
        .foregroundStyle(Palette.text)
    } else if let endsAt = hold?.endsAt {
      VStack(spacing: 0) {
        if phase == "getReady" {
          Text("Get ready").font(.caption).foregroundStyle(Palette.text2)
        }
        Text(timerInterval: Date.now...max(Date.now, endsAt), countsDown: true)
          .font(.system(size: 44, weight: .bold, design: .rounded).monospacedDigit())
          .foregroundStyle(phase == "getReady" ? Palette.teal : Palette.text)
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
          .buttonStyle(.quiet)
          Button("Skip rest") { model.skipRest() }.buttonStyle(.primaryFern)
        }
        if let feedback = active.feedback {
          FeedbackView(feedback: feedback)
        }
        if active.closing {
          Button("Finish") { Task { await model.stop() } }
            .buttonStyle(.primaryTeal)
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
        let selected = feedback.current == value
        Button {
          model.rate(value)
        } label: {
          HStack {
            Text(label).font(.footnote)
            Spacer()
            if selected { Image(systemName: "checkmark") }
          }
        }
        .buttonStyle(FilledButtonStyle(
          fill: selected ? color : Palette.surface,
          ink: selected ? Palette.onAccent : Palette.text))
      }
      HStack {
        Button("Skip") { model.skipFeedback() }
        if feedback.neverAgainDone {
          Label("Won't return", systemImage: "checkmark").font(.footnote)
            .foregroundStyle(Palette.text2).frame(maxWidth: .infinity)
        } else {
          Button("Never again") { model.neverAgain() }
        }
      }
      .font(.footnote)
      .buttonStyle(.quiet)
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
      .buttonStyle(.primaryTeal)
      if let set = active.set, active.rest == nil {
        Button("Skip set") { model.skip(set: set) }.buttonStyle(.quiet)
      }
      Button("End workout") { confirmStop = true }
        .buttonStyle(.quiet)
        .confirmationDialog("End this workout?", isPresented: $confirmStop) {
          Button("End workout") { Task { await model.stop() } }
          Button("Keep going", role: .cancel) {}
        }
    }
    .padding(.horizontal, 4)
  }
}
