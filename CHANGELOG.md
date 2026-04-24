# Changelog

## 3.1.0 — 2026-04-23

### Added
- Usage tracking via `@narai/connector-toolkit@^3.1.0`. Installs three plugin hooks (`PostToolUse`, `SessionEnd`, `SessionStart` stale-check) that record per-call response bytes and estimated tokens to `.claude/connectors/github/usage/<session>.jsonl` and summarize at session end.

### Changed
- `@narai/connector-toolkit` dep bumped from `^3.0.0-rc.1` to `^3.1.0`.

## 3.0.1 — 2026-04-22

### Added
- `scope(ctx)` now returns `${host}/${defaultOwner}` (e.g. `api.github.com/narailabs`) when `defaultOwner` is configured, and `null` otherwise. Hardships and patterns.yaml are now keyed by tenant when the owner is set.
- `GithubClient` accepts a new optional `defaultOwner` constructor field.
- `GithubClient` exposes public getters `defaultOwner: string | null` and `host: string`.
- `loadGithubCredentials()` now also reads `GITHUB_OWNER` (via `resolveSecret` + `process.env` fallback) and returns it alongside the token.

## 3.0.0 — 2026-04-22

### BREAKING

- Requires `@narai/connector-toolkit@^3.0.0-rc.1`. See toolkit 3.0 changelog for `Decision`, `ExtendedEnvelope`, and `HardshipEntry` breaking changes (most do not affect this connector; documented for downstream awareness).

### Added

- `scope(ctx)` callback added (global-only pending a better key). Hardships and patterns.yaml live in the global tier. TODO: ideal key is `${host}/${owner}` but `owner` varies per-request and is not stored on `GithubClient`; a future enhancement can add a constructor-level default or derive scope from the first call. (See toolkit design doc at `connector-toolkit/docs/plans/2026-04-22-self-improvement-loop-design.md`.)

## 2.1.0 — 2026-04-21

### Added

- `get_issue_comments(owner, repo, issue_number)` — list issue / PR-conversation comments.
- `get_pr_review_comments(owner, repo, pr_number)` — returns both `reviews` (review-level decisions + body) and `inline_comments` (file/line diff comments).
- `list_release_assets(owner, repo, tag)` — release metadata + asset listing.
- `get_release_asset(owner, repo, asset_id)` — download via `Accept: application/octet-stream`, sha256, extract PDF/DOCX/PPTX/text.
- Client methods: `getIssueComments`, `getPullReviews`, `getPullReviewComments`, `listReleaseByTag`, `getReleaseAssetDownload`.

### Changed

- Dependency bump: `@narai/connector-toolkit` ^2.1.0-rc.2 for `extractBinary` / `FORMAT_MAP` / `sanitizeLabel`.
