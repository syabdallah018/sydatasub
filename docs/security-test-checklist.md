# Security Test Checklist

This checklist is intended for release smoke-tests and incident response checks.

## Auth Routes

- Route: `POST /api/auth/login`
- Check: rejects cross-site requests without valid origin/referer
- Check: rate limit triggers after repeated invalid PIN attempts
- Check: invalid credentials do not leak whether phone exists

- Route: `POST /api/auth/signup`
- Check: rejects cross-site requests without valid origin/referer
- Check: prevents duplicate phone registration
- Check: creates session cookie as `httpOnly`, `secure` (prod), and proper `sameSite`

- Route: `POST /api/auth/change-pin`
- Check: requires authenticated session
- Check: rejects invalid current PIN
- Check: enforces 6-digit numeric PIN format

- Route: `POST /api/auth/logout`
- Check: rejects cross-site mutation
- Check: clears auth cookie

## Purchase Routes

- Route: `POST /api/data/purchase`
- Check: requires authenticated session and buyer phone/session match
- Check: duplicate detection requires explicit confirmation
- Check: insufficient funds is handled before provider call

- Route: `POST /api/airtime/purchase`
- Check: requires authenticated session and buyer phone/session match
- Check: duplicate detection requires explicit confirmation
- Check: failed provider call refunds wallet and marks transaction failed

## Webhook Routes

- Route: `POST /api/payments/webhook` (Billstack target)
- Check: rejects invalid/missing `x-wiaxy-signature` header
- Check: verifies `x-wiaxy-signature === md5(BILLSTACK_SECRET_KEY)`
- Check: idempotency is keyed by both BillStack `reference` and `wiaxy_ref`
- Check: repeated delivery of same event does not double-credit wallet

## Reserved Account Routes

- Route: `POST /api/payments/reserved-account`
- Check: requires authenticated session
- Check: rejects cross-site mutation without valid origin/referer
- Check: outbound request includes `Authorization: Bearer <BILLSTACK_SECRET_KEY>`

- Route: `GET /api/payments/reserved-account`
- Check: requires authenticated session
- Check: does not leak account details for other users

## Admin Auth and Mutations

- Route: `POST /api/admin/login`, `POST /api/admin/verify`, `POST /api/admin/logout`
- Check: strict same-origin mutation guard (`requireOrigin`)
- Check: admin cookie uses strict policy and shorter session TTL

- Route group: `POST|PATCH|DELETE /api/admin/*`
- Check: enforce `enforceAdminMutationGuard` on every mutation route
- Check: audit logs appear for blocked origin/rate-limit cases
- Check: audit logs appear for high-risk actions (balance change, PIN reset, role/tier changes, reward reset, agent approvals)

## Agent Flow

- Route: `POST /api/agent/apply`
- Check: authenticated users only
- Check: duplicate/pending applications are blocked
- Check: rate limit protects repeated submission spam

- Route: `GET /api/agent/status`
- Check: weekly sales metric reflects last 7 days data purchase volume
- Check: at-risk flag behaves correctly when under 50GB threshold

## Frontend Session and Cache Safety

- Check: service worker updates on deploy without app freeze
- Check: app shell and `/_next/*` are fetched fresh after deployment
- Check: production cookies are not readable from JavaScript
