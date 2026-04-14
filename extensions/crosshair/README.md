# graphjs-extension-crosshair

First-party GraphJS extension that draws configurable crosshair guide lines.

## Install

This extension is intentionally separate from GraphJS core. Add it explicitly in your project.

## Usage

```js
import { Graph } from "../../graphjs/src/index.js";
import { crosshairPlugin } from "./index.js";

const graph = new Graph("#graph", {
  plugins: [
    {
      plugin: crosshairPlugin,
      options: {
        x: 220,
        y: 140
      }
    }
  ]
});
```

## Options

- `enabled` (boolean, default `true`)
- `x` (number or `null`) pixel x position inside the canvas
- `y` (number or `null`) pixel y position inside the canvas
- `color` (string)
- `lineWidth` (number)
