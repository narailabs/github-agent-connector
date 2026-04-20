# @narai/github-agent-connector

Read-only GitHub connector. Supports repo info, code search, PR/issue listing, and single-file retrieval. Uses a Personal Access Token via `GITHUB_TOKEN`.

## Install

```bash
npm install @narai/github-agent-connector
export GITHUB_TOKEN="ghp_…"
```

## Claude Code plugin

A ready-to-install Claude Code plugin lives at [`plugin/`](./plugin). It adds a `github-agent` skill and a `/github-agent <action> <params-json>` slash command, wrapping this connector. The plugin is excluded from the npm tarball via `.npmignore`; Claude Code marketplaces point directly at the `plugin/` subdirectory of this repo.

## License

MIT
