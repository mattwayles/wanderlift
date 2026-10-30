import SwiftUI
import WidgetKit

/// A launcher for the watch face: the app's mark, and a tap opens the watch app. There is nothing to
/// refresh, so the timeline is one entry that never expires.
struct LauncherEntry: TimelineEntry {
  let date: Date
}

struct LauncherProvider: TimelineProvider {
  func placeholder(in context: Context) -> LauncherEntry { LauncherEntry(date: Date()) }

  func getSnapshot(in context: Context, completion: @escaping (LauncherEntry) -> Void) {
    completion(LauncherEntry(date: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<LauncherEntry>) -> Void) {
    completion(Timeline(entries: [LauncherEntry(date: Date())], policy: .never))
  }
}

struct LauncherView: View {
  @Environment(\.widgetFamily) private var family

  var body: some View {
    switch family {
    case .accessoryInline:
      Label("Wanderlift", systemImage: "figure.strengthtraining.traditional")
    case .accessoryRectangular:
      HStack(spacing: 8) {
        Image(systemName: "figure.strengthtraining.traditional").font(.title3)
        Text("Wanderlift").font(.headline)
      }
      .widgetAccentable()
    default:
      Image(systemName: "figure.strengthtraining.traditional")
        .font(.title2)
        .widgetAccentable()
    }
  }
}

struct WatchComplication: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "WanderliftLauncher", provider: LauncherProvider()) { _ in
      LauncherView().containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Wanderlift")
    .description("Open Wanderlift from your watch face.")
    .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct WatchComplicationBundle: WidgetBundle {
  var body: some Widget { WatchComplication() }
}
