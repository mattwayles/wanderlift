import SwiftUI

@main
struct WanderliftWatchApp: App {
  @StateObject private var model = WatchWorkoutModel.shared
  @Environment(\.scenePhase) private var scenePhase

  init() {
    PhoneLink.shared.activate()
    WatchCues.shared.configure()
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(model)
        .preferredColorScheme(.dark)
        .onChange(of: scenePhase) { _, phase in
          if phase == .active { WatchCues.shared.clearDelivered() }
        }
    }
  }
}
