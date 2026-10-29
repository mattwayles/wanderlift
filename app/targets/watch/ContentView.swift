import SwiftUI

/// One screen per thing the phone can be doing: nothing, a plan waiting, a workout running, or (on
/// this watch only) a workout just stopped.
struct ContentView: View {
  @EnvironmentObject var model: WatchWorkoutModel

  var body: some View {
    Group {
      if let summary = model.summary {
        DoneView(summary: summary)
      } else if model.link.needsUpdate {
        MessageView(
          symbol: "arrow.down.circle", title: "Update needed",
          detail: "Update Wanderlift on your iPhone.")
      } else if let active = model.state.active, model.state.mode == "active" {
        ActiveView(active: active)
      } else if let ready = model.state.ready, model.state.mode == "ready" {
        ReadyView(ready: ready)
      } else {
        MessageView(
          symbol: "iphone", title: "Wanderlift",
          detail: model.link.reachable
            ? "Plan a workout on your iPhone to start it here."
            : "Your iPhone is out of range.")
      }
    }
    .background(Palette.bg)
  }
}

struct MessageView: View {
  let symbol: String
  let title: String
  let detail: String

  var body: some View {
    VStack(spacing: 6) {
      Image(systemName: symbol).font(.title2).foregroundStyle(Palette.teal)
      Text(title).font(.headline).foregroundStyle(Palette.text)
      Text(detail).font(.footnote).multilineTextAlignment(.center).foregroundStyle(Palette.text2)
    }
    .padding()
  }
}

/// A plan is waiting on the phone (or a workout was left): one tap starts it.
struct ReadyView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let ready: WatchReady

  var body: some View {
    ScrollView {
      VStack(spacing: 6) {
        Text(ready.title).font(.headline).foregroundStyle(Palette.text).multilineTextAlignment(.center)
        Text("\(ready.exerciseCount) exercises · \(ready.minutes) min")
          .font(.footnote).foregroundStyle(Palette.text2)
        Button {
          model.start()
        } label: {
          Text(model.starting ? "Starting…" : (ready.resuming ? "Resume" : "Start"))
            .font(.headline).frame(maxWidth: .infinity)
        }
        .tint(Palette.teal)
        .foregroundStyle(Palette.onAccent)
        .disabled(model.starting)
        if !model.link.reachable {
          Text("iPhone out of range. It starts when it is back.")
            .font(.caption2).multilineTextAlignment(.center).foregroundStyle(Palette.text2)
        }
      }
    }
  }
}

/// After stopping: how it went, and where FINISH is.
struct DoneView: View {
  @EnvironmentObject var model: WatchWorkoutModel
  let summary: HealthWorkout.Summary

  var body: some View {
    ScrollView {
      VStack(spacing: 6) {
        Image(systemName: "checkmark.circle.fill").font(.title2).foregroundStyle(Palette.fern)
        Text("Nice work").font(.headline).foregroundStyle(Palette.text)
        Text(formatClock(Int(summary.duration))).font(.title3.monospacedDigit())
          .foregroundStyle(Palette.text)
        if let hr = summary.averageHeartRate {
          Text("avg \(Int(hr.rounded())) bpm").font(.footnote).foregroundStyle(Palette.text2)
        }
        if let kcal = summary.energyKcal {
          Text("\(Int(kcal.rounded())) kcal").font(.footnote).foregroundStyle(Palette.text2)
        }
        Text("Finish on your iPhone to log it.").font(.caption2).multilineTextAlignment(.center)
          .foregroundStyle(Palette.text2)
        Button("Done") { model.dismissSummary() }.tint(Palette.teal)
      }
    }
  }
}

func formatClock(_ seconds: Int) -> String {
  let h = seconds / 3600
  let m = (seconds % 3600) / 60
  let s = seconds % 60
  return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
}
