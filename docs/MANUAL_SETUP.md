# Manual Setup Checklist

These steps must be completed outside the codebase.

## EAS Environment Variables

Set these for the production build profile:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_PRIVACY_URL=
EXPO_PUBLIC_TERMS_URL=
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to EAS public env vars.

## Supabase

- [ ] Confirm project URL matches the production app project
- [ ] Confirm anon/publishable key is active
- [ ] Confirm RLS is enabled on all public app tables
- [ ] Confirm `delete-account` Edge Function is active
- [ ] Confirm `delete-account` has `verify_jwt=true`
- [ ] Set Edge Function secrets:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] Enable leaked password protection in Supabase Auth dashboard
- [ ] Review Supabase advisors after each schema change

## Apple Developer / App Store Connect

- [ ] Bundle ID: `com.gymple.app`
- [ ] Enable Sign in with Apple capability
- [ ] Create monthly IAP product: `com.gymple.premium.monthly`
- [ ] Create lifetime IAP product: `com.gymple.premium.life`
- [ ] Add localized display names/descriptions for IAP products
- [ ] Fill pricing, tax, and availability
- [ ] Add App Privacy details
- [ ] Add Privacy Policy URL
- [ ] Add Support URL
- [ ] Add screenshots for required device sizes
- [ ] Add a demo account in App Review notes

## RevenueCat

- [ ] Add iOS app with the App Store bundle ID
- [ ] Add entitlement: `premium`
- [ ] Add offering: `default`
- [ ] Attach monthly product: `com.gymple.premium.monthly`
- [ ] Attach lifetime product: `com.gymple.premium.life`
- [ ] Confirm the iOS SDK public key is used in EAS env
- [ ] Test product loading in a development build or TestFlight

## OAuth

- [ ] Supabase Google provider is enabled and has correct client credentials
- [ ] Supabase Apple provider is enabled and has correct Apple credentials
- [ ] Redirect URL scheme `gymtracker://auth/callback` works on iOS build
- [ ] Test canceling OAuth returns to the app cleanly

## Legal

- [ ] Confirm the support email in `docs/privacy.html`, `docs/terms.html`, and `docs/support.html` is correct
- [ ] If publishing as a company, replace "the developer" in `docs/terms.html` with the legal company name
- [ ] Enable GitHub Pages: repository Settings -> Pages -> Deploy from a branch -> `main` -> `/docs`
- [ ] After GitHub Pages deploys, open both legal pages in a browser
- [ ] Set `EXPO_PUBLIC_PRIVACY_URL` to the deployed `privacy.html` URL
- [ ] Set `EXPO_PUBLIC_TERMS_URL` to the deployed `terms.html` URL
- [ ] Add the Privacy Policy URL in App Store Connect
- [ ] Add the Support URL in App Store Connect
- [ ] Policy describes collected data: email/account ID, profile preferences, workout data, purchase entitlement data, and support diagnostics if collected
- [ ] Policy describes deletion and retention
- [ ] Policy names third parties: Supabase, RevenueCat, Apple, Google if Google sign-in remains enabled
- [ ] Decide and add a GitHub license before making the repository public
