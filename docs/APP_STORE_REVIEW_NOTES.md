# App Store Review Notes

Use this as a draft for App Store Connect review notes. Replace placeholders before submission.

## Demo Account

Email: `reviewer+gymple@example.com`

Password: `REPLACE_WITH_DEMO_PASSWORD`

The reviewer can also create a new account with email/password. Backend services are live during review.

## What The App Does

Gymple is a gym workout tracker. Users can create workouts, add exercises and sets, save workout history, manage templates, and create custom exercises.

## Premium

Premium unlocks unlimited workout saves and Premium features.

RevenueCat/App Store configuration:

- Entitlement: `premium`
- Offering: `default`
- Monthly product: `com.gymple.premium.monthly`
- Lifetime product: `com.gymple.premium.life`

The app uses Apple in-app purchase for digital Premium access. Purchases can be restored from the Premium screen and the paywall.

## Account Deletion

Account deletion is available in:

Settings -> Data & Privacy -> Delete account

This calls the Supabase `delete-account` Edge Function and removes the user's app data and authentication account. The confirmation text tells users that deleting the account does not cancel an active Apple subscription and that subscriptions are managed through iOS Settings.

## Privacy And Legal

Privacy Policy and Terms links are available in:

- Settings -> Data & Privacy
- Premium paywall footer

Replace these before review:

- Privacy Policy: `https://zielinskimarcin.github.io/gymple/privacy.html`
- Terms: `https://zielinskimarcin.github.io/gymple/terms.html`
- Support URL: `https://zielinskimarcin.github.io/gymple/support.html`

## Reviewer Tips

To test the free limit, use a fresh non-Premium account and save workouts until the paywall appears. Existing saved workouts can still be edited without triggering the limit.

To test purchases, use Apple's sandbox/TestFlight purchase flow. Prices are loaded from the App Store through RevenueCat and do not appear in Expo Go.

## Official Review References

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Account deletion guidance: https://developer.apple.com/support/offering-account-deletion-in-your-app
