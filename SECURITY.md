# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for a security vulnerability.** This repository handles internal HR, financial, and client data, so responsible disclosure matters.

Instead, report it privately through one of these channels:

- Direct message to the Project Lead or a Founder/Admin.
- Internal Discord `#support` channel, marked confidential, or a DM to an Admin if the issue is sensitive.
- Email a Founder/Admin directly if you're an external contributor without Discord access.

Please include:

- A clear description of the vulnerability and its potential impact.
- Steps to reproduce (screenshots, request/response examples, or a minimal PoC if possible).
- Any affected module (e.g. Firestore rules, RBAC, Auth, Client Portal).

## Response Process

- We aim to acknowledge reports within a few business days.
- Confirmed vulnerabilities will be triaged, fixed on a private branch, and deployed before any public discussion.
- You'll be credited (if you want to be) once the fix ships.

## Supported Versions

Only the `master` branch (current production deployment on Vercel) is actively maintained and receives security fixes.

## Scope

Particular areas of concern for this project, given its architecture:

- `firestore.rules` and `storage.rules` — these are the primary access-control boundary since the client talks directly to Firestore.
- Authentication and session handling (Firebase Auth, Google Workspace SSO).
- Role-based access control (RBAC) logic in `src/lib/` and `src/components/layout/RoleGuard`.
- API routes under `src/app/api/` (Discord webhooks, OCR, third-party integrations).
- Handling of `.env.local` / Vercel environment variables and any other secrets.

## Out of Scope

- Vulnerabilities requiring physical access to a team member's device.
- Issues in third-party services themselves (Firebase, Vercel, Discord) — report those to the respective vendor.
