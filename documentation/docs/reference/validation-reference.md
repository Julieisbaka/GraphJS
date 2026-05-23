# Validation API Reference

The validation module provides runtime checks for options, domain objects, and plugin contracts.

## validateDomain(domain)

- Description: Validates optional domain override object shape and numeric ordering.
- Parameters:
  - `domain`: `null` or `{ xMin?, xMax?, yMin?, yMax? }`
- Output: `void` (throws on invalid values)
- Version added: Initial line (<= 0.2.4)
- Deprecation version: None
- Removal version: None
- Changes: none documented in changelog as API changes
- Interactions: called by graph domain setters and render bound resolution checks.
- Use cases: external domain validation before calling graph APIs.
- Best practices: validate user input and keep `xMin < xMax`, `yMin < yMax`.

## validateGraphOptions(options)

- Description: Validates required graph options and nested option structures.
- Parameters:
  - `options`: `GraphOptions`
- Output: `void` (throws on invalid values)
- Version added: Initial line (<= 0.2.4)
- Deprecation version: None
- Removal version: None
- Changes:
  - Validation code path is stripped from production bundle in optimized builds (`0.2.6` and follow-up optimizations).
- Interactions: constructor and `setOptions` call this in development mode.
- Use cases: preflight checks in tests and local development.
- Best practices: keep option objects normalized and avoid passing user-untrusted shape directly.

## validatePluginContract(plugin)

- Description: Ensures plugin structural integrity (`id`, dependency arrays, capability shape).
- Parameters:
  - `plugin`: plugin object
- Output: `void` (throws on invalid contracts)
- Version added: Initial line (<= 0.2.4)
- Deprecation version: None
- Removal version: None
- Changes:
  - Runtime plugin id collision behavior hardened in `0.5.1` at registry layer.
- Interactions: called by plugin host during plugin normalization in development mode.
- Use cases: plugin authoring and CI checks.
- Best practices: use unique, stable ids and declare dependencies explicitly.

## Validation Error Handling

- Validation APIs throw `Error` synchronously.
- They do not return structured error objects.
- Catch and map these errors in UI layers when exposing configuration editors.
