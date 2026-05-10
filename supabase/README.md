# Supabase

This directory contains the backend pieces required by Gymple.

## Files

- `schema.sql` is an application schema snapshot for local review/new project bootstrap.
- `functions/delete-account/index.ts` is the production account deletion Edge Function.
- `migrations/20260510160000_release_hardening.sql` is a prepared hardening migration for review before applying to production.

## Production Project

The current production Supabase project URL is configured through `EXPO_PUBLIC_SUPABASE_URL`. Do not hardcode it in source code.

## Edge Function Secrets

The `delete-account` function needs:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Keep `SUPABASE_SERVICE_ROLE_KEY` only in Supabase function secrets.

## Applying Migrations

Review migrations before applying them to production. For DDL changes, apply through the Supabase migration workflow, not ad-hoc SQL in the app.

After each migration:

```bash
npm run typecheck
npx expo-doctor
```

Then check Supabase security and performance advisors.
