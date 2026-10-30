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
  /// The heart rate readout. A reading, not a judgment: it is the same red at any value.
  static let heart = Color(hex: 0xFF4D4D)
  static let summit = Color(hex: 0xC77DFF)
  static let onAccent = Color(hex: 0x0B0E13)
}

/// A button painted as a solid fill with text chosen for it. `.tint` on watchOS draws a dim,
/// translucent plate, so near-black text on it was close to invisible; this fixes both the plate
/// and the text. Primary actions are a bright accent with dark ink (>= 8:1); everything else is the
/// dark surface with light text (>= 11:1).
struct FilledButtonStyle: ButtonStyle {
  var fill: Color = Palette.surface
  var ink: Color = Palette.text

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .foregroundStyle(ink)
      .padding(.vertical, 8)
      .padding(.horizontal, 10)
      .frame(maxWidth: .infinity)
      .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(fill))
      .opacity(configuration.isPressed ? 0.7 : 1)
  }
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

extension ButtonStyle where Self == FilledButtonStyle {
  static var primaryTeal: FilledButtonStyle { .init(fill: Palette.teal, ink: Palette.onAccent) }
  static var primaryFern: FilledButtonStyle { .init(fill: Palette.fern, ink: Palette.onAccent) }
  static var quiet: FilledButtonStyle { .init() }
}
