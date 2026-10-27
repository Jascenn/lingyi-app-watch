# Changelog

## [Unreleased]

### Added

- Add contribution, security, issue-form, CODEOWNERS and license documentation.

## 0.4.0 - 2026-10-12

- Add optional JEV (TypeSafe System One) AI risk assessment: every pending update gets a low/medium/high risk level, confidence, and reason alongside the local policy rules.
- Add a settings modal in the dashboard: configure the TypeSafe API key, model, and proxy URL from the UI; the key is stored locally in `data/settings.json` (gitignored) and only ever shown masked.
- Add an AI status pill in the header showing whether AI assessment is active, how many items were assessed this round, and the high-risk count.
- Improve app-name matching for brew casks and MAS lookups: local prefix/containment heuristics now run first, with optional JEV semantic fallback for ambiguous or abbreviated names.
- AI features are strictly optional: without a key everything keeps working with the existing local rules, and failed AI calls degrade silently.
- Add a Node.js test suite (`npm test`) covering env parsing, name matching, and JEV fallbacks; type check stays green.
- New runtime dependency: `undici` (used only for optional proxy support).

## 0.3.0 - 2026-04-06

- Rename the public-facing product to `Lingyi App Watch`.
- Refine the dashboard into usage-first views with activity-aware sorting.
- Add clickable summary cards, header-level select-all, and `Shift` range selection.
- Keep third-party audit findings and manual annotations in the same risk workflow.
- Add release-facing docs, screenshot asset path, and Cloudflare go-live guidance.

## 0.2.0 - 2026-04-06

- Add Notion-like dashboard layout and cleaner typography.
- Support web filters, sorting, and bulk annotations.
- Add upgrade actions with risk-based blocking and manual-source fallbacks.
- Publish the first GitHub-hosted version of the project.
