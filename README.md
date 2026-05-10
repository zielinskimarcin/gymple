# Gymple

Gymple is a mobile gym tracker built with Expo and React Native. It supports workout logging, templates, custom exercises, history, account sync through Supabase, and Premium unlocks through RevenueCat/App Store in-app purchases.

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- Supabase Auth, Postgres, Row Level Security, Edge Functions
- RevenueCat for App Store purchases
- TypeScript

## Features

- Email/password, Google OAuth, and Sign in with Apple
- Onboarding with profile preferences
- Workout creation, editing, deletion, and history
- Template selection and custom templates
- Custom exercises with duplicate-name protection
- Localized UI in English, Polish, and Italian
- Premium paywall with monthly and lifetime products
- In-app account deletion backed by a Supabase Edge Function

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_PRIVACY_URL=
EXPO_PUBLIC_TERMS_URL=
```

Run locally:

```bash
npm run start
```

Run checks:

```bash
npm run typecheck
npx expo-doctor
npm audit --omit=dev
npx expo export --platform ios --output-dir /tmp/gymple-ios-export
```

## Supabase

The app expects the public schema described in [supabase/schema.sql](supabase/schema.sql). The account deletion backend lives in [supabase/functions/delete-account/index.ts](supabase/functions/delete-account/index.ts).

The Edge Function requires these Supabase function secrets:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Keep the service-role key only in Supabase Edge Function secrets. Never put it in `.env`, EAS public env vars, or client code.

## Premium Setup

The app currently expects these RevenueCat/App Store identifiers:

- RevenueCat entitlement: `premium`
- RevenueCat offering: `default`
- Monthly product: `com.gymple.premium.monthly`
- Lifetime product: `com.gymple.premium.life`

Prices are loaded at runtime from RevenueCat/App Store. They will not appear in Expo Go; test purchases in a development build or TestFlight.

## Release Docs

- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [App Store review notes](docs/APP_STORE_REVIEW_NOTES.md)
- [Manual setup checklist](docs/MANUAL_SETUP.md)

## Legal Pages

The `docs` directory includes static GitHub Pages files:

- `privacy.html`
- `terms.html`
- `support.html`
- `index.html`

The legal/support pages currently use `marcinzielinskii@icloud.com` as the support email. Then configure GitHub Pages to deploy from the `main` branch and `/docs` folder.

## Security Notes

- `.env` is ignored by git.
- `.env.example` contains placeholders only.
- Supabase anon/publishable keys are client-side public keys; service-role keys must stay server-side.
- Before publishing, choose and add a license file if this repository should be open source under a specific license.
