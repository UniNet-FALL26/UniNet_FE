# UniNet mobile authentication handoff

## Scope

Expo Router now uses `src/app/index.tsx` as an authentication gate, `(auth)` for welcome and authentication, and `(tabs)` for the existing starter Home/Explore screens. Login and Student Register share semantic colors and reusable Button/Input components. The approved visual reference guided welcome, login, student registration, partner selection and form, two profile steps, and password reset screens. Community, Groups, Opportunities, Profile, CV, Post, Group, and Settings routes are placeholders only.

## Backend connection

- Set `EXPO_PUBLIC_API_URL` from `.env.example` when the API is available.
- `src/services/auth.service.ts` contains provisional `/auth/login`, `/auth/register/student`, `/auth/register/partner`, and `/auth/me` paths. Confirm request and response contracts with backend before enabling production use.
- Login and student registration do not fabricate success without a working API. Google OAuth, password reset, profile completion, and partner submission need backend and OAuth configuration. The email confirmation route explicitly states that no email has been sent while the service is unavailable.
- Tokens currently live in memory for the active app process. Add encrypted native storage before shipping persistent sessions; no password is stored.
- Replace the code-drawn UniNet mark and Google letter with approved brand assets when supplied. The onboarding student illustration is newly generated from the visual reference.

## Verification

- `npx tsc --noEmit`
- `npx expo export --platform all --no-bytecode --max-workers 1` for a JavaScript bundle check in environments that cannot spawn Hermes.
- Browser checked at 360, 375, 390, and 430 CSS pixel viewports, plus inline validation and missing-API feedback.
