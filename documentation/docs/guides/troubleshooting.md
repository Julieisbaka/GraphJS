# Troubleshooting Guide

## Installation and Import Issues

### Error: package not found

Symptoms:
- Import resolution errors for `@julieisbaka/graphjs` or first-party extension packages.

Checks:
- Ensure package is in dependencies.
- Verify lockfile and package manager consistency.
- Verify Node version is `>=22`.

Fix:
- Reinstall dependencies and run a clean build.

## Canvas Binding Issues

### Error: Could not find canvas with selector

Cause:
- `new Graph("#selector")` target does not match an existing canvas.

Fix:
- Ensure the canvas exists before Graph initialization.
- Prefer direct element references when lifecycle timing is uncertain.

## Validation Errors

Common validation failures:
- Invalid `width` or `height`.
- Invalid `padding` shape.
- Invalid `sampling.maxPoints` or `sampling.method`.
- Invalid plugin contract (`id`, `before`, `after`, capabilities shape).

Fix:
- Compare against the option and plugin contract references in this docs folder.

## Plugin Runtime Failures

### Plugin throws during hook/install

Behavior:
- With `pluginErrorBoundary.enabled: true`, errors are swallowed and logged.
- With `enabled: false`, errors are rethrown.

Fix:
- Provide `pluginErrorBoundary.onError` handler for diagnostics.
- Add defensive guards in plugin hooks.

## Command Resolution Problems

### Error: Unknown command

Cause:
- Command not registered or wrong namespace.

Fix:
- Use `graph.listCommands()` to inspect active commands.
- Confirm plugin was configured and command is namespaced as expected.

## Rendering and Performance Problems

### Slow rendering with large series

Fix:
- Enable sampling and set suitable `maxPoints`.
- Keep static layer caching enabled.
- Avoid expensive per-point logic in plugin hooks.

### Graph not updating

Fix:
- Ensure `.render()` is called after data/options changes.
- Call `api.requestRender()` in plugin command and pointer handlers.
- If using dirty rendering, call `render({ force: true })` for out-of-band draws.

## First-party Plugin Specific Notes

- Pan-Zoom: check pointer event listener setup and viewport state reset on data changes.
- Tooltip Cursor: ensure `hitRadius` is reasonable for your pixel density.
- Time-Scale: custom formatter should never throw; wrap internals defensively.
- Watermark: if watermark rendering fails, verify plugin implementation/version and validate hook context usage.

## Upgrade Checklist

- Read root `CHANGELOG.md` for API behavior changes.
- Verify deprecated APIs such as `clearDomain()` are not relied on long-term.
- Re-run tests for hooks and commands after upgrading.
