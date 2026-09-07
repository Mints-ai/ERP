# Contributing to Mints Global ERP

Thanks for contributing! This is an internal, proprietary project — these guidelines exist to keep changes safe, reviewable, and easy to trace back to their author.

## Before You Start

- Make sure you have local dev environment set up per the [README](./README.md#-getting-started) (Node.js 18+, Firebase project access, `.env.local` configured).
- Check open [Issues](https://github.com/Mints-ai/ERP/issues) and [Pull Requests](https://github.com/Mints-ai/ERP/pulls) to avoid duplicate work.
- For anything non-trivial (new module, schema change, RBAC change), post in `#dev-requests` on Discord before starting, so it can be scoped and assigned.

## Branch Naming

Use `type/module-name`, for example:

- `feature/attendance-system`
- `fix/login-button`
- `docs/update-readme`

Common types: `feature`, `fix`, `docs`, `chore`, `refactor`, `test`.

## Commit Messages

We use semantic commit messages:

```
feat: add new reporting dashboard
fix: resolve responsive layout on mobile
chore: update dependencies
```

## Making Changes

1. Create a branch off `master` using the naming convention above.
2. Keep PRs focused — one feature or fix per PR where possible.
3. Run `npm run build` locally and confirm it passes before opening a PR.
4. If your change touches `firestore.rules` or `storage.rules`, flag this explicitly in the PR description — these require extra review since they control data access.
5. Never commit `.env.local`, API keys, or other secrets. Double-check `git status` before pushing.

## Pull Request Process

1. Open a PR targeting `master`.
2. Fill out the PR template with a clear description of what changed and why.
3. Link any related issue.
4. Request a review from at least one senior developer or admin.
5. Address review comments; once approved, the PR is merged and deploys automatically via Vercel.

## Code Style

- TypeScript throughout — avoid `any` where a real type is available.
- Follow existing patterns in `src/components/` and `src/lib/` rather than introducing new conventions ad hoc.
- Run the linter (`eslint.config.mjs`) before pushing.

## Reporting Bugs or Requesting Features

Use the issue templates provided — they help make sure we get the context needed to act on the report quickly.

## Security Issues

Do **not** open a public issue for a security vulnerability. See [SECURITY.md](./SECURITY.md) instead.

## Questions

Drop a message in `#dev-requests` on the internal Discord, or ask your Project Lead.
