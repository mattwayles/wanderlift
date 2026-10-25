## Track: 52 — Music app choice
Last updated: 2026-10-24
### Done
- (none yet)
### In progress
- Migration 0043 `users.music_app` (+ data.ts, schema, usersRepo), then `app/src/lib/musicApps.ts`,
  generalise `SpotifyButton` -> `MusicButton`, Settings "Music" group (inline radio list).
### Next
- Tests alongside each step; `npm run check`; commit per step.
### Decisions / gotchas
- Apps: Spotify, Apple Music, YouTube Music, Amazon Music, plus "None" (hides the button).
- `users.music_app` NULL = never chosen: resolve Spotify if `canOpenURL('spotify://')`, else Apple
  Music. No onboarding question, no "Automatic" row in Settings; the resolved app shows selected.
- Only `spotify` needs `LSApplicationQueriesSchemes` (only app we probe) -> needs a native rebuild.
- Logos: FontAwesome glyphs (spotify, youtube-play, amazon) and a tinted `music` note for Apple Music.
- Fallback when the app won't open: web page (Apple Music: music.apple.com, though music:// ships with iOS).
