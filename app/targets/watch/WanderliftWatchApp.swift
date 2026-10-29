import SwiftUI

@main
struct WanderliftWatchApp: App {
  @StateObject private var model = WatchWorkoutModel.shared

  init() {
    PhoneLink.shared.activate()
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(model)
        .preferredColorScheme(.dark)
    }
  }
}
