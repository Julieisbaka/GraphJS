# GraphJS First-Party Extensions

This folder contains first-party GraphJS extensions and is intentionally separate from `graphjs/src`.

- These extensions are **not** part of the core package payload.
- They are designed to plug into GraphJS via the plugin API.
- There is no root `index.js` export here by design; users opt into each extension explicitly.
- Import each extension directly and pass it through the `plugins` option when creating a graph instance.

Current extensions:

- `crosshair`
- `legend`
- `tooltip-cursor`
- `pan-zoom`
- `time-scale`
- `watermark`

Example imports:

- `../extensions/crosshair/index.js`
- `../extensions/legend/index.js`
- `../extensions/tooltip-cursor/index.js`
- `../extensions/pan-zoom/index.js`
- `../extensions/time-scale/index.js`
- `../extensions/watermark/index.js`
