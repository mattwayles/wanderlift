import Foundation
import HealthKit

/// The HealthKit workout on the wrist: it keeps the app running with the wrist down, reads the live
/// heart rate and energy while the workout runs, and saves the workout to Health when it ends.
///
/// Read access is limited to this workout's own live samples (the builder's statistics): nothing is
/// queried from history, and nothing leaves the watch and phone. Denied or unavailable (no Health on
/// this device), the workout still runs from the wrist without heart rate.
@MainActor
final class HealthWorkout: NSObject, ObservableObject {
  struct Summary {
    var duration: TimeInterval
    var averageHeartRate: Double?
    var energyKcal: Double?
    /// The workout is in Health.
    var saved: Bool
  }

  @Published private(set) var heartRate: Double?
  @Published private(set) var energyKcal: Double = 0
  /// The session this workout belongs to, while one is running.
  private(set) var sessionId: String?
  private(set) var paused = false

  private let store = HKHealthStore()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?
  private var startedAt: Date?

  private let heartRateType = HKQuantityType(.heartRate)
  private let energyType = HKQuantityType(.activeEnergyBurned)

  func start(sessionId: String) async {
    guard self.sessionId == nil, HKHealthStore.isHealthDataAvailable() else { return }
    self.sessionId = sessionId
    do {
      try await store.requestAuthorization(
        toShare: [HKObjectType.workoutType(), energyType],
        read: [heartRateType, energyType]
      )
      let config = HKWorkoutConfiguration()
      config.activityType = .functionalStrengthTraining
      config.locationType = .indoor
      let session = try HKWorkoutSession(healthStore: store, configuration: config)
      let builder = session.associatedWorkoutBuilder()
      builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
      session.delegate = self
      builder.delegate = self
      self.session = session
      self.builder = builder
      let now = Date()
      startedAt = now
      session.startActivity(with: now)
      try await builder.beginCollection(at: now)
    } catch {
      // Not authorised, or Health unavailable: train on without it.
      self.session = nil
      self.builder = nil
    }
  }

  func setPaused(_ pause: Bool) {
    guard let session, pause != paused else { return }
    paused = pause
    if pause { session.pause() } else { session.resume() }
  }

  /// Ends the workout and saves it. Nil if no HealthKit workout was running.
  func finish() async -> Summary? {
    guard sessionId != nil else { return nil }
    defer { reset() }
    guard let session, let builder else { return nil }
    let end = Date()
    session.end()
    var saved = false
    var average: Double?
    var energy: Double?
    do {
      try await builder.endCollection(at: end)
      let workout = try await builder.finishWorkout()
      saved = workout != nil
      average = builder.statistics(for: heartRateType)?.averageQuantity()?
        .doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
      energy = builder.statistics(for: energyType)?.sumQuantity()?.doubleValue(for: .kilocalorie())
    } catch {
      saved = false
    }
    return Summary(
      duration: end.timeIntervalSince(startedAt ?? end),
      averageHeartRate: average,
      energyKcal: energy,
      saved: saved
    )
  }

  private func reset() {
    session = nil
    builder = nil
    sessionId = nil
    paused = false
    startedAt = nil
    heartRate = nil
    energyKcal = 0
  }
}

extension HealthWorkout: HKWorkoutSessionDelegate {
  nonisolated func workoutSession(
    _ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState, date: Date
  ) {}

  nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension HealthWorkout: HKLiveWorkoutBuilderDelegate {
  nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  nonisolated func workoutBuilder(
    _ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>
  ) {
    for type in collectedTypes {
      guard let quantityType = type as? HKQuantityType,
        let statistics = workoutBuilder.statistics(for: quantityType)
      else { continue }
      switch quantityType.identifier {
      case HKQuantityTypeIdentifier.heartRate.rawValue:
        let bpm = statistics.mostRecentQuantity()?.doubleValue(
          for: HKUnit.count().unitDivided(by: .minute()))
        Task { @MainActor in self.heartRate = bpm }
      case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
        let kcal = statistics.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
        Task { @MainActor in self.energyKcal = kcal }
      default:
        break
      }
    }
  }
}
