## Track: 52 — Music app choice
Last updated: 2026-10-24
### Done
- [x] Migration 0043 `users.music_app` + schema + usersRepo (committed)
- [x] `lib/musicApps.ts`, `MusicButton` (replaces `SpotifyButton`), Settings "Music" group, tests
### In progress
- `npm run check`, then commit.
### Next
- Device pass (needs a native rebuild for `LSApplicationQueriesSchemes`): see Decisions.
### Decisions / gotchas
- Apps: Spotify, Apple Music, YouTube Music, Amazon Music, plus "None" (hides the button).
- `users.music_app` NULL = never chosen: resolve Spotify if `canOpenURL('spotify://')`, else Apple
  Music. No onboarding question, no "Automatic" row in Settings; the resolved app shows selected.
- Only `spotify` needs `LSApplicationQueriesSchemes` (only app we probe) -> needs a native rebuild.
- Logos: FontAwesome glyphs (spotify, youtube-play, amazon) and a tinted `music` note for Apple Music.
- Fallback when the app won't open: web page (Apple Music: music.apple.com, though music:// ships with iOS).
- Device pass owed: with Spotify installed the button shows Spotify and opens it; delete Spotify ->
  Apple Music; pick each app in Settings and confirm the glyph and that it opens (YouTube Music and
  Amazon Music fall back to their web pages when the app is absent); None hides the button.
- The YouTube Music glyph is FontAwesome's YouTube mark (no YT Music glyph in the set); Apple Music is
  a red music note, not Apple's logo. Swap in official assets if wanted.
- Not verified here: the exact `amazonmusic://` / `youtubemusic://` schemes open each app's home.
