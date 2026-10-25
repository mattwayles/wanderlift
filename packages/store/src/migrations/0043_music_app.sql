-- 0043_music_app.sql — Track 52: which music app the workout's music button opens
-- ('spotify' | 'apple_music' | 'youtube_music' | 'amazon_music' | 'none'). NULL means never
-- chosen: the app picks Spotify when it is installed, otherwise Apple Music.

ALTER TABLE users ADD COLUMN music_app TEXT;
