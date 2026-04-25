# @julieisbaka/graphjs-extension-watermark

First-party GraphJS extension that renders a text watermark after graph rendering.

## Install

This extension is intentionally separate from GraphJS core. Add it explicitly in your project.

```bash
npm install @julieisbaka/graphjs @julieisbaka/graphjs-extension-watermark
```

## Usage

```js
import { Graph } from "@julieisbaka/graphjs";
import { watermarkPlugin } from "@julieisbaka/graphjs-extension-watermark";

const graph = new Graph("#graph", {
  plugins: [
    {
      plugin: watermarkPlugin,
      options: {
        text: "internal"
      }
    }
  ]
});
```

## Options

- `enabled` (boolean, default `true`)
- `text` (string)
- `color` (string)
- `font` (string)
- `offsetX` (number)
- `offsetY` (number)
