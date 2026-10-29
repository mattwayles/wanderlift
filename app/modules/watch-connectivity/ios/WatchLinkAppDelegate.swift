import ExpoModulesCore
import UIKit

/// Activates the watch link as the app launches, including a launch in the background for a watch
/// message, which happens before (and without) any JS.
public class WatchLinkAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    WatchLink.shared.activate()
    return true
  }
}
