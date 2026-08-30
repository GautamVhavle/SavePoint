# Security Policy

SavePoint handles public player content and authenticated mutations. If you believe you have found a vulnerability, please report it responsibly.

## Reporting

- Preferred: open a private security advisory via GitHub's **Security → Advisories → New draft security advisory** on this repository.
- Alternatively contact the maintainer directly; details are on the GitHub profile.

Please include reproduction steps, affected routes/components, and any proof-of-concept. Do **not** open public issues for security problems, and do not test against accounts or data you do not own.

## Scope and guarantees the codebase tries to keep

- Every mutation route requires a valid Auth0 JWT and verifies resource ownership (`profile_id` derived from the token subject, never from client input).
- `DEV_AUTH_BYPASS` is impossible to enable outside development/test environments (the env validator refuses it in staging and production).
- IGDB/Twitch, Gemini, and Vercel Blob credentials live only in server-side environment variables and are never exposed to the browser bundle.
- Guide rate limiting uses HMAC-hashed visitor IPs, never raw addresses.
- Uploaded media flows through Vercel Blob using short-lived, server-issued client upload tokens scoped to a single purpose-derived path under `users/<profile_id>/`.
- Request bodies above `MAX_BODY_BYTES` are rejected before parsing; upload
  signing, IGDB search, and Guide calls each carry their own rate limits.
- The crawler-facing HTML function only fetches from `SAVEPOINT_API_URL` with handle allowlisting and timeouts.

## Supported versions

Only the latest commit on `main` receives security fixes. Deployments should track `main` or tagged releases closely.

## Disclosure timeline

We aim to acknowledge reports within 72 hours, provide a fix or mitigation within 14 days for confirmed issues affecting production configurations, and credit reporters in release notes unless they prefer anonymity.
