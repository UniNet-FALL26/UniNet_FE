# Assessor profile spacing and income wallet

Confirmed 2026-11-01: inset/center the existing left Assessor profile content like the reference profile (desktop content max-width 1000 with 24px internal side padding), keeping its current information and the 400px right settings rail. Preserve mobile layout.

Expose Income Wallet in Assessor Settings only; remove it from Student/Partner Settings. Update wallet screen and API/service eligibility consistently to active Assessor accounts, including finance recipient lookup. Preserve stored balances, ledger/withdrawal records, ownership, money arithmetic, idempotency and accountant/admin operations. No migrations, automatic credits, actual withdrawals or deployments.

Plan: add role-policy regressions; update layout and Settings/wallet guards; update backend wallet/recipient eligibility and existing fixtures; verify focused backend/FE tests, isolated mocked browser navigation/withdrawal retry/cancel and desktop profile geometry, then typecheck/export and handoff.
