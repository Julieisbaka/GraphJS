# GraphJS First-Party Extensions

This folder contains first-party GraphJS extensions and is intentionally separate from `@julieisbaka/graphjs` core.

- These extensions are **not** part of the core package payload.
- They are designed to plug into GraphJS via the plugin API.
- There is no root `index.js` export here by design; users opt into each extension explicitly.
- Import each extension directly and pass it through the `plugins` option when creating a graph instance.

Current extensions:

- `@julieisbaka/graphjs-extension-crosshair`
- `@julieisbaka/graphjs-extension-legend`
- `@julieisbaka/graphjs-extension-pan-zoom`
- `@julieisbaka/graphjs-extension-tooltip-cursor` (compatibility package)
- `@julieisbaka/graphjs-extension-time-scale`
- `@julieisbaka/graphjs-extension-watermark`

Example imports:

- `@julieisbaka/graphjs-extension-crosshair`
- `@julieisbaka/graphjs-extension-legend`
- `@julieisbaka/graphjs-extension-pan-zoom`
- `@julieisbaka/graphjs-extension-tooltip-cursor` (compatibility package)
- `@julieisbaka/graphjs-extension-time-scale`
- `@julieisbaka/graphjs-extension-watermark`
