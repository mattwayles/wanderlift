-- 0041_review_prompt.sql — Track 50b: when the App Store rating sheet was last requested, so the
-- app asks at most once per app version and not again within 120 days. `local_date` string
-- (YYYY-MM-DD, invariant 6) plus the app version string; both NULL means never asked.

ALTER TABLE users ADD COLUMN review_prompt_last_asked_date TEXT;
ALTER TABLE users ADD COLUMN review_prompt_last_asked_version TEXT;
