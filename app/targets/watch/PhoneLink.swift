import Combine
import Foundation
import WatchConnectivity

/// The watch's end of WatchConnectivity. The phone is authoritative: this holds the newest
/// `WatchState` it has sent and turns taps into `WatchCommand`s.
///
/// A command goes as a live message when the phone is in range and as a queued user-info transfer
/// when it is not, so a tap made just out of range is delivered when the phone is next reachable.
/// The phone drops a command it has already seen (by id), and one for a set it has moved past (by
/// set key), so redelivery is harmless.
final class PhoneLink: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = PhoneLink()

  @Published private(set) var state: WatchState = .idle
  @Published private(set) var reachable = false
  /// The phone's state is from a newer app than this watch app understands.
  @Published private(set) var needsUpdate = false

  private var session: WCSession? { WCSession.isSupported() ? WCSession.default : nil }

  func activate() {
    guard let session, session.delegate == nil else { return }
    session.delegate = self
    session.activate()
  }

  func send(_ command: WatchCommand) {
    guard let session, let data = try? JSONEncoder().encode(command),
      let json = String(data: data, encoding: .utf8)
    else { return }
    let payload = ["command": json]
    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil) { _ in
        session.transferUserInfo(payload)
      }
    } else {
      session.transferUserInfo(payload)
    }
  }

  // MARK: Incoming state

  private func apply(_ payload: [String: Any]) {
    guard let json = payload["state"] as? String, let data = json.data(using: .utf8) else { return }
    guard let version = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["v"] as? Int
    else { return }
    guard version == watchProtocolVersion else {
      DispatchQueue.main.async { self.needsUpdate = true }
      return
    }
    guard let next = try? JSONDecoder().decode(WatchState.self, from: data) else { return }
    DispatchQueue.main.async {
      self.needsUpdate = false
      // A state delivered late (or twice) never replaces a newer one.
      if next.rev >= self.state.rev { self.state = next }
    }
  }

  // MARK: WCSessionDelegate

  func session(
    _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    DispatchQueue.main.async { self.reachable = session.isReachable }
    // The phone's latest state waits in the application context.
    apply(session.receivedApplicationContext)
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async { self.reachable = session.isReachable }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    apply(applicationContext)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    apply(message)
  }
}
