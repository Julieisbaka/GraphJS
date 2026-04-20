# GitHub Copilot Instructions

## Versioning, Changelog, and Documentation

Whenever you make a change to **any part of this repository**, you must also update the following for the changed component:

### For the core library (`/`)
- **`package.json`** — bump the `version` field following [Semantic Versioning](https://semver.org/):
  - `patch` (e.g. `0.2.8` → `0.2.9`) for bug fixes and minor internal changes
  - `minor` (e.g. `0.2.8` → `0.3.0`) for new backwards-compatible features
  - `major` (e.g. `0.2.8` → `1.0.0`) for breaking changes
- **`CHANGELOG.md`** — add an entry under the new version with the date and a description of what changed
- **`README.md`** — update any sections that describe the changed behaviour, API, or configuration

### For each extension (`/extensions/<name>/`)
Each extension is an independent package. When you change files inside an extension folder, update **only that extension's files**:
- **`extensions/<name>/package.json`** — bump the `version` field using the same Semantic Versioning rules above
- **`extensions/<name>/CHANGELOG.md`** — add an entry under the new version with the date and a description of what changed
- **`extensions/<name>/README.md`** (if present) — update any sections that describe the changed behaviour, API, or configuration

### Changelog entry format
Use the following format when adding a new entry to any `CHANGELOG.md`:

```
## [<new-version>] - YYYY-MM-DD

### Added / Changed / Fixed / Removed
- <description of the change>
```

### Summary
- Changes to the core library → update root `package.json`, `CHANGELOG.md`, and `README.md`
- Changes to an extension → update that extension's `package.json`, `CHANGELOG.md`, and `README.md`
- Never update a component's version or changelog for a change made in a different component
