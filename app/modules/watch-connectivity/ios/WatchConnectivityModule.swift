import ExpoModulesCore

/// JS's side of the watch link: send the state, read the commands. See `WatchLink`.
public class WatchConnectivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WatchConnectivity")

    /// Sent to a listening JS when a command has been queued; JS answers with `drainCommands`.
    Events("onWake")

    OnStartObserving {
      WatchLink.shared.onWake = { [weak self] in self?.sendEvent("onWake", [:]) }
    }

    OnStopObserving {
      WatchLink.shared.onWake = nil
    }

    OnCreate {
      WatchLink.shared.activate()
    }

    /// `supported`, `paired`, `installed` (the watch app) and `reachable` (in range right now).
    Function("status") { () -> [String: Bool] in
      WatchLink.shared.status()
    }

    /// The newest workout state, as the JSON the watch decodes.
    Function("sendState") { (json: String) in
      WatchLink.shared.send(state: json)
    }

    /// Remembers a string across launches (newest 50 kept).
    Function("setFlag") { (key: String) in
      WatchLink.shared.setFlag(key)
    }

    Function("flags") { () -> [String] in
      WatchLink.shared.flags()
    }

    /// Every command received since the last drain, oldest first, as JSON strings.
    Function("drainCommands") { () -> [String] in
      WatchLink.shared.drain()
    }
  }
}
