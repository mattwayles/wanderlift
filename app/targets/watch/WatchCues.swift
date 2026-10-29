import Foundation
import UserNotifications
import WatchKit

/// The taps for the last three seconds of a timed hold, a rest or a count-in, and for the moment it
/// ends. The phone owns the clock and its beeps; this is the wrist's half of the same moments.
///
/// A haptic played from the app is dropped once the display is off, and a countdown that ends
/// silently is a safety problem for a hold. So every cue is scheduled twice: as a local
/// notification, which the system delivers on time whatever the watch is doing, and as an in-app
/// haptic. Exactly one of them is allowed to sound. While the app is the one on screen the
/// notification is suppressed (`willPresent`) and the in-app haptic plays; otherwise the in-app
/// haptic stays quiet and the notification taps the wrist.
@MainActor
final class WatchCues: NSObject, UNUserNotificationCenterDelegate {
  static let shared = WatchCues()

  struct Target: Equatable {
    /// What the countdown is for; a new key is a new countdown even if its end is close.
    var key: String
    var endsAt: Date
    /// The notification's title when it ends ("Rest over", "Go", ...).
    var endTitle: String
  }

  /// Seconds before the end that get a short tap. The end itself (0) gets the strong one.
  private static let offsets = [3, 2, 1, 0]
  private static let prefix = "wanderlift.cue."

  private let center = UNUserNotificationCenter.current()
  private var target: Target?
  private var tasks: [Task<Void, Never>] = []
  private var authorizationRequested = false

  /// Call once at launch: the delegate has to be set before the first notification can arrive.
  func configure() {
    center.delegate = self
  }

  /// Make the scheduled cues match `next`; nil cancels them. Called on every state from the phone,
  /// so an unchanged target is left alone (rescheduling would shift the taps by the latency).
  func sync(_ next: Target?) {
    if let next, let current = target, current.key == next.key,
      abs(current.endsAt.timeIntervalSince(next.endsAt)) < 0.6
    {
      return
    }
    cancel()
    guard let next else { return }
    target = next
    requestAuthorizationOnce()
    for offset in Self.offsets {
      let fireAt = next.endsAt.addingTimeInterval(-Double(offset))
      let delay = fireAt.timeIntervalSinceNow
      guard delay > 0.1 else { continue }
      schedule(offset: offset, key: next.key, title: offset == 0 ? next.endTitle : "\(offset)", delay: delay)
    }
  }

  /// Drop the banners left behind by cues that fired while the wrist was down.
  func clearDelivered() {
    center.getDeliveredNotifications { [center] delivered in
      let ids = delivered.map(\.request.identifier).filter { $0.hasPrefix(Self.prefix) }
      center.removeDeliveredNotifications(withIdentifiers: ids)
    }
  }

  private func schedule(offset: Int, key: String, title: String, delay: TimeInterval) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.sound = .default
    content.threadIdentifier = "wanderlift.cues"
    let request = UNNotificationRequest(
      identifier: "\(Self.prefix)\(key).\(offset)",
      content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
    )
    center.add(request)

    tasks.append(
      Task { @MainActor in
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        guard !Task.isCancelled, WKApplication.shared().applicationState == .active else { return }
        WKInterfaceDevice.current().play(offset == 0 ? .notification : .click)
      })
  }

  private func cancel() {
    tasks.forEach { $0.cancel() }
    tasks = []
    target = nil
    center.getPendingNotificationRequests { [center] pending in
      let ids = pending.map(\.identifier).filter { $0.hasPrefix(Self.prefix) }
      center.removePendingNotificationRequests(withIdentifiers: ids)
    }
    clearDelivered()
  }

  private func requestAuthorizationOnce() {
    guard !authorizationRequested else { return }
    authorizationRequested = true
    center.requestAuthorization(options: [.alert, .sound]) { _, _ in }
  }

  // The app on screen taps by itself; the notification is for when it is not.
  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification
  ) async -> UNNotificationPresentationOptions {
    await MainActor.run {
      WKApplication.shared().applicationState == .active ? [] : [.banner, .sound]
    }
  }
}
