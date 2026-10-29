import Foundation
import WatchConnectivity

/// The phone's end of WatchConnectivity. Protocol-agnostic: it moves JSON strings and knows nothing
/// of their shape except that a command has an `id` (to drop redelivery).
///
/// The delegate is activated at app launch (`WatchLinkAppDelegate`), not when JS starts: iOS wakes
/// the app for a watch message, and the message has to be caught before any JS exists. Commands are
/// therefore written to disk first; JS drains them when it is listening and again on foreground.
final class WatchLink: NSObject, WCSessionDelegate {
  static let shared = WatchLink()

  private let defaults = UserDefaults.standard
  private let queueKey = "watchlink.commands"
  private let seenKey = "watchlink.seen"
  private let stateKey = "watchlink.state"
  private let flagsKey = "watchlink.flags"
  private let lock = NSLock()

  /// Called when a command lands, so a listening JS can drain. Set by the Expo module.
  var onWake: (() -> Void)?

  private var session: WCSession? { WCSession.isSupported() ? WCSession.default : nil }

  func activate() {
    guard let session, session.delegate == nil else { return }
    session.delegate = self
    session.activate()
  }

  // MARK: Phone -> watch

  /// The newest state wins: the application context is delivered even if the watch app is not
  /// running, and a live message makes it instant when it is.
  func send(state json: String) {
    defaults.set(json, forKey: stateKey)
    guard let session, session.activationState == .activated else { return }
    guard session.isPaired, session.isWatchAppInstalled else { return }
    try? session.updateApplicationContext(["state": json])
    if session.isReachable {
      session.sendMessage(["state": json], replyHandler: nil, errorHandler: nil)
    }
  }

  func status() -> [String: Bool] {
    guard let session else { return ["supported": false, "paired": false, "installed": false, "reachable": false] }
    return [
      "supported": true,
      "paired": session.isPaired,
      "installed": session.isWatchAppInstalled,
      "reachable": session.isReachable,
    ]
  }

  // MARK: Watch -> phone

  /// Commands that arrived and have not been handed to JS yet, oldest first.
  func drain() -> [String] {
    lock.lock()
    defer { lock.unlock() }
    let queued = defaults.stringArray(forKey: queueKey) ?? []
    defaults.removeObject(forKey: queueKey)
    return queued
  }

  private func receive(_ payload: [String: Any]) {
    guard let json = payload["command"] as? String,
      let data = json.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let id = object["id"] as? String
    else { return }
    lock.lock()
    var seen = defaults.stringArray(forKey: seenKey) ?? []
    if seen.contains(id) {
      lock.unlock()
      return
    }
    seen.append(id)
    defaults.set(Array(seen.suffix(200)), forKey: seenKey)
    var queued = defaults.stringArray(forKey: queueKey) ?? []
    queued.append(json)
    defaults.set(queued, forKey: queueKey)
    lock.unlock()
    DispatchQueue.main.async { self.onWake?() }
  }

  // MARK: Flags

  /// A small remembered set of strings (the phone uses it for "the watch saved this workout to
  /// Health"), kept across launches. The newest 50 are kept.
  func setFlag(_ key: String) {
    lock.lock()
    var flags = defaults.stringArray(forKey: flagsKey) ?? []
    if !flags.contains(key) { flags.append(key) }
    defaults.set(Array(flags.suffix(50)), forKey: flagsKey)
    lock.unlock()
  }

  func flags() -> [String] {
    defaults.stringArray(forKey: flagsKey) ?? []
  }

  // MARK: WCSessionDelegate

  func session(
    _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if activationState == .activated, let json = defaults.string(forKey: stateKey) { send(state: json) }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    if session.isReachable, let json = defaults.string(forKey: stateKey) { send(state: json) }
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    receive(message)
  }

  func session(
    _ session: WCSession, didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    receive(message)
    replyHandler(["ok": true])
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    receive(userInfo)
  }
}
