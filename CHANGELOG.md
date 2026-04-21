# Changelog

## 2.1.0 — 2026-04-21

### Added

- `get_issue_comments(owner, repo, issue_number)` — list issue / PR-conversation comments.
- `get_pr_review_comments(owner, repo, pr_number)` — returns both `reviews` (review-level decisions + body) and `inline_comments` (file/line diff comments).
- `list_release_assets(owner, repo, tag)` — release metadata + asset listing.
- `get_release_asset(owner, repo, asset_id)` — download via `Accept: application/octet-stream`, sha256, extract PDF/DOCX/PPTX/text.
- Client methods: `getIssueComments`, `getPullReviews`, `getPullReviewComments`, `listReleaseByTag`, `getReleaseAssetDownload`.

### Changed

- Dependency bump: `@narai/connector-toolkit` ^2.1.0-rc.2 for `extractBinary` / `FORMAT_MAP` / `sanitizeLabel`.
