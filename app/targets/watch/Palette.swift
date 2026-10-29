import SwiftUI

/// Midnight (src/theme/palettes.ts): the watch is always dark. Teal while training, fern while
/// resting, summit for the one "too hard" answer. No red anywhere: a hard set is information.
enum Palette {
  static let bg = Color(hex: 0x0B0E13)
  static let surface = Color(hex: 0x1C2330)
  static let text = Color(hex: 0xF7F3EA)
  static let text2 = Color(hex: 0xB4BCC8)
  static let teal = Color(hex: 0x4FB8C4)
  static let fern = Color(hex: 0x68CF59)
  static let summit = Color(hex: 0xC77DFF)
  static let onAccent = Color(hex: 0x0B0E13)
}

extension Color {
  init(hex: UInt32) {
    self.init(
      red: Double((hex >> 16) & 0xFF) / 255,
      green: Double((hex >> 8) & 0xFF) / 255,
      blue: Double(hex & 0xFF) / 255
    )
  }
}
