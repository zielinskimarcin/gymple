-- Prepared release hardening migration.
-- Review before applying to production.

create index if not exists idx_template_favourites_template
  on public.template_favourites (template_id);

create unique index if not exists uniq_custom_exercises_user_name
  on public.custom_exercises (user_id, lower(name));

create unique index if not exists uniq_templates_user_name
  on public.templates (user_id, lower(name));

drop index if exists public.workouts_user_started_idx;

insert into public.default_exercises (id, name, muscle_group) values
  ('bench', 'Bench Press', 'Chest'),
  ('incline_db', 'Incline DB Press', 'Chest'),
  ('row', 'Barbell Row', 'Back'),
  ('deadlift', 'Deadlift', 'Back'),
  ('pullup', 'Pull-Up', 'Back'),
  ('squat', 'Back Squat', 'Legs'),
  ('rdl', 'Romanian Deadlift', 'Legs'),
  ('ohp', 'Overhead Press', 'Shoulders'),
  ('curl', 'Barbell Curl', 'Arms'),
  ('pushdown', 'Triceps Pushdown', 'Arms'),
  ('plank', 'Plank', 'Core'),
  ('burpee', 'Burpees', 'Full Body'),
  ('treadmill', 'Treadmill Run', 'Cardio')
on conflict (id) do update set
  name = excluded.name,
  muscle_group = excluded.muscle_group;

insert into public.default_templates (id, name, icon, exercise_ids) values
  ('tpl_push', 'Push', 'flash', array['bench', 'incline_db', 'ohp', 'pushdown']),
  ('tpl_pull', 'Pull', 'body', array['row', 'pullup', 'curl', 'plank']),
  ('tpl_legs', 'Legs', 'barbell', array['squat', 'rdl'])
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  exercise_ids = excluded.exercise_ids;
