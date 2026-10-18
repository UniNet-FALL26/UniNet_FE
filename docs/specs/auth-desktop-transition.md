# Desktop welcome → login transition

- At ≥900px, keep the campus illustration mounted in the auth layout and slide it from the welcome screen's right side to the login screen's left side. Fade the departing content and slide/fade the login form in from the right. Reverse on the login back button.
- Login ends with a translucent illustration on the left and a white angular form panel on the right. Reuse the existing login form, validation, Google sign-in and auth destinations. Direct `/login` visits render the final layout immediately.
- Respect reduced-motion preferences; cancel pending navigation/animations on unmount and unrelated navigation. Prevent duplicate transition clicks. Mobile keeps its current layout/navigation.
- Tasks: add the shared background/motion provider to the auth layout; connect welcome/login content; verify responsive bounds, forward/back transitions, direct login, reduced motion, validation and successful mocked login. No new dependency or backend change.
