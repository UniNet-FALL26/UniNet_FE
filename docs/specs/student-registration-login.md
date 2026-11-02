# Student registration requires manual login

After email/password student registration succeeds, keep the client unauthenticated, navigate to login and show a clear success message. Store no returned session and do not enter protected tabs. Registration errors stay on the form. Explicit login still establishes the session. Preserve partner registration, Google sign-in, validation and existing API contracts.

Plan: reproduce session creation/navigation with focused hook/form tests; remove student registration's session callback and route to login with a success notice; verify registration → protected-route denial/reload → manual login in isolated Chrome, then typecheck/export and handoff. No backend/schema/dependency changes.
