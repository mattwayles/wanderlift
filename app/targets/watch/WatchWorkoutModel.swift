import Combine
import Foundation
import WatchKit

/// What the watch does about the phone's state, and what its taps ask of the phone. The phone is
/// authoritative: every action is a `WatchCommand`, and the screen changes when the phone's next
/// state says it has. The one thing the watch owns is the HealthKit workout, which follows the
/// phone's workout: started when one is running, paused with it, saved when it ends.
@MainActor
final class WatchWorkoutModel: ObservableObject {
  static let shared = WatchWorkoutModel()

  let link = PhoneLink.shared
  let health = HealthWorkout()

  /// Shown after stopping, until dismissed.
  @Published var summary: HealthWorkout.Summary?
  /// Start was tapped and the phone has not answered yet.
  @Published var starting = false
  /// The feedback question this wrist has answered, skipped or dismissed. The rest screen waits on
  /// the question until then; a question the phone shows as already rated needs no answer here.
  @Published var answeredFeedback: String?

  /// The session this watch has stopped; its Health workout is saved and must not restart if the
  /// phone goes back to it.
  private var finishedSessionId: String?
  private var leaveTask: Task<Void, Never>?
  private var cancellables = Set<AnyCancellable>()

  /// How long the phone may leave the workout screen (Summary, Home, a re-render) before the
  /// watch treats the workout as over.
  private let leaveGraceSeconds: UInt64 = 20

  private init() {
    link.$state
      .receive(on: DispatchQueue.main)
      .sink { [weak self] state in self?.reconcile(state) }
      .store(in: &cancellables)
    health.objectWillChange
      .receive(on: DispatchQueue.main)
      .sink { [weak self] _ in self?.objectWillChange.send() }
      .store(in: &cancellables)
    link.objectWillChange
      .receive(on: DispatchQueue.main)
      .sink { [weak self] _ in self?.objectWillChange.send() }
      .store(in: &cancellables)
    // Each heart rate reading goes to the phone's Workout screen, at most one every two seconds.
    health.$heartRate
      .compactMap { $0 }
      .throttle(for: .seconds(2), scheduler: DispatchQueue.main, latest: true)
      .sink { [weak self] bpm in
        guard let self, self.state.active != nil else { return }
        self.link.sendHeartRate(bpm)
      }
      .store(in: &cancellables)
  }

  var state: WatchState { link.state }

  // MARK: Following the phone

  /// The countdown the wrist should tap along with: the rest, or a hold's count-in, side or
  /// switch. None while paused (the clock is frozen) or before a hold is started.
  private func cueTarget(_ active: WatchActive) -> WatchCues.Target? {
    if active.paused { return nil }
    if let rest = active.rest {
      return .init(
        key: "rest.\(active.set?.setKey ?? "closing")",
        endsAt: Date(timeIntervalSince1970: rest.endsAtMs / 1000),
        endTitle: "Rest over")
    }
    if let hold = active.hold, hold.phase != "ready", hold.remainingSec == nil, let end = hold.endsAt {
      let title = hold.phase == "getReady" ? "Go" : (hold.phase == "switch" ? "Switch sides" : "Time")
      return .init(key: "hold.\(hold.setKey).\(hold.phase).\(hold.side)", endsAt: end, endTitle: title)
    }
    return nil
  }

  private func reconcile(_ state: WatchState) {
    WatchCues.shared.sync(state.active.flatMap(cueTarget))
    if let active = state.active {
      starting = false
      leaveTask?.cancel()
      leaveTask = nil
      if health.sessionId == nil, finishedSessionId != active.sessionId {
        Task { await health.start(sessionId: active.sessionId) }
      }
      if health.sessionId == active.sessionId { health.setPaused(active.paused) }
    } else if let sessionId = health.sessionId, leaveTask == nil {
      // The phone left the workout screen. Probably a pause to Home or a trip to Summary, so wait
      // a moment before deciding it is over.
      leaveTask = Task { [weak self, leaveGraceSeconds] in
        try? await Task.sleep(nanoseconds: leaveGraceSeconds * 1_000_000_000)
        guard !Task.isCancelled else { return }
        await self?.stop(sessionId: sessionId, announce: false)
      }
    }
  }

  // MARK: Commands

  private func send(_ type: String, _ build: (inout WatchCommand) -> Void = { _ in }) {
    guard let sessionId = state.active?.sessionId ?? state.ready?.sessionId else { return }
    var command = WatchCommand(type: type, sessionId: sessionId)
    build(&command)
    link.send(command)
  }

  func start() {
    guard let ready = state.ready else { return }
    starting = true
    link.send(WatchCommand(type: "start", sessionId: ready.sessionId))
    // The phone answers with an active state; if it never does, offer Start again.
    Task { [weak self] in
      try? await Task.sleep(nanoseconds: 15 * 1_000_000_000)
      self?.starting = false
    }
  }

  func complete(set: WatchSet, reps: Int? = nil, seconds: Int? = nil) {
    WKInterfaceDevice.current().play(.success)
    send("completeSet") {
      $0.setKey = set.setKey
      $0.reps = reps
      $0.seconds = seconds
    }
  }

  func skip(set: WatchSet) {
    send("skipSet") { $0.setKey = set.setKey }
  }

  func startHold(set: WatchSet) {
    WKInterfaceDevice.current().play(.start)
    send("startHold") { $0.setKey = set.setKey }
  }

  /// One crown step (5s) of the hold's length, before it starts.
  func adjustHold(set: WatchSet, by seconds: Int) {
    send("adjustHold") {
      $0.setKey = set.setKey
      $0.deltaSec = seconds
    }
  }

  func setPaused(_ paused: Bool) { send(paused ? "pause" : "resume") }
  func skipRest() { send("skipRest") }
  func extendRest(by seconds: Int) { send("extendRest") { $0.deltaSec = seconds } }
  func rate(_ difficulty: String) {
    WKInterfaceDevice.current().play(.click)
    send("rate") { $0.difficulty = difficulty }
    answeredFeedback = pendingQuestion
  }

  func skipFeedback() {
    send("skipFeedback")
    answeredFeedback = pendingQuestion
  }
  func neverAgain() {
    WKInterfaceDevice.current().play(.click)
    send("neverAgain")
    answeredFeedback = pendingQuestion
  }

  private var pendingQuestion: String? { state.active?.feedback?.question }

  /// Stop from the wrist: save the Health workout, tell the phone (which goes to Summary), and show
  /// how it went. FINISH stays on the phone.
  func stop() async {
    guard let sessionId = state.active?.sessionId ?? health.sessionId else { return }
    await stop(sessionId: sessionId, announce: true)
  }

  private func stop(sessionId: String, announce: Bool) async {
    leaveTask?.cancel()
    leaveTask = nil
    finishedSessionId = sessionId
    let result = await health.finish()
    var command = WatchCommand(type: "end", sessionId: sessionId)
    command.healthSaved = result?.saved ?? false
    link.send(command)
    if announce {
      WKInterfaceDevice.current().play(.stop)
      summary = result ?? HealthWorkout.Summary(duration: 0, averageHeartRate: nil, energyKcal: nil, saved: false)
    }
  }

  func dismissSummary() { summary = nil }
}
