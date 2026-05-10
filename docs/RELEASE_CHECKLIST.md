# Release Checklist

Use this before every TestFlight or App Store submission.

## Code Checks

- [ ] `npm run typecheck`
- [ ] `npx expo-doctor`
- [ ] `npm audit --omit=dev`
- [ ] `npx expo export --platform ios --output-dir /tmp/gymple-ios-export`
- [ ] Search source code for development-only logging, breakpoints, and temporary task markers
- [ ] Confirm `.env` is ignored and not tracked
- [ ] Confirm `.env.example` contains placeholders only

## Core App QA

- [ ] Fresh install opens splash, auth, and onboarding correctly
- [ ] Email signup creates an account and profile
- [ ] Email login works after app restart
- [ ] Google OAuth works on iOS build
- [ ] Sign in with Apple works on iOS build
- [ ] Language switch works for English, Polish, Italian, and System
- [ ] Weight unit switch works for kg and lbs
- [ ] Start workout
- [ ] Add default exercise
- [ ] Add custom exercise
- [ ] Duplicate custom exercise name is blocked
- [ ] Add sets, edit reps/weight/time/distance
- [ ] Finish workout and save
- [ ] Edit an existing workout
- [ ] Delete an existing workout
- [ ] History loads without blank flashes or broken loaders
- [ ] History pull-to-refresh works
- [ ] Exercises list opens and custom exercise edit/delete works
- [ ] Templates can be selected
- [ ] Custom template can be created, edited, favorited, and deleted

## Premium QA

- [ ] Free user can save workouts below the free limit
- [ ] Free user at the limit sees the paywall when saving a new workout
- [ ] Free user at the limit can still edit existing saved workouts
- [ ] Settings -> Premium opens the paywall
- [ ] Paywall shows App Store prices for both products
- [ ] Monthly purchase activates entitlement `premium`
- [ ] Lifetime purchase activates entitlement `premium`
- [ ] Restore purchases works
- [ ] Manage subscription opens native subscription management for Premium users
- [ ] Paywall Terms and Privacy links open public URLs
- [ ] Settings Terms and Privacy links open public URLs

## Account Deletion QA

- [ ] Delete account is easy to find in Settings -> Data & Privacy
- [ ] Delete account confirmation explains that Apple subscriptions are managed separately
- [ ] Delete account removes workouts, templates, custom exercises, profile, and auth user
- [ ] After deletion, the app signs out and returns to auth/onboarding
- [ ] Supabase Edge Function logs show `POST 200`

## App Store Connect

- [ ] Bundle ID matches `com.gymple.app`
- [ ] Version/build numbers are incremented
- [ ] App Privacy labels match actual data collection
- [ ] Privacy Policy URL is live
- [ ] Terms URL is live
- [ ] Support URL is live
- [ ] Screenshots show real app screens, not only login/splash
- [ ] Metadata mentions Premium clearly if screenshots or app flow show it
- [ ] Demo account is provided in review notes
- [ ] Backend services are live during review
- [ ] IAP products are submitted/approved and visible to review
- [ ] App Review notes include Premium product IDs and entitlement details

## Supabase Checks

- [ ] RLS is enabled on all app tables
- [ ] User-owned tables only expose own rows
- [ ] `delete-account` Edge Function is active with `verify_jwt=true`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only as an Edge Function secret
- [ ] Supabase Auth leaked password protection is enabled in the dashboard
- [ ] Review Supabase advisors and resolve any new security warnings

## Final Gate

- [ ] TestFlight build installed on a real iPhone
- [ ] Full new-user flow tested from clean install
- [ ] Sandbox purchase and restore tested
- [ ] Account deletion tested with a throwaway account
- [ ] No private data appears in screenshots or App Store metadata
