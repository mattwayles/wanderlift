-- 0042_starting_point.sql — Track 51a: the "Where are you starting?" answer from onboarding
-- ('restarting' | 'occasional' | 'active' | 'regular'). NULL means never answered; existing
-- users keep NULL and their ladders are untouched.

ALTER TABLE users ADD COLUMN starting_point TEXT;
