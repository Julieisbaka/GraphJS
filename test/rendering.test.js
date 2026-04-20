import test from "node:test";
import assert from "node:assert/strict";

import {
  drawLineSeries,
  makeStaticLayerKey,
  computeLayout,
  createBufferCanvas,
  drawBackdrop,
  drawGrid
} from "../src/core/rendering.js";

/**
 * Creates a recording 2D context that logs every method call so we can assert
 * on draw operations without a real browser canvas.
 */
function createRecordingCtx() {
  const calls = [];
  const ctx = new Proxy(
    {
      strokeStyle: null,
      fillStyle: null,
      lineWidth: null
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => {
          calls.push({ method: prop, args });
        };
      },
      set(target, prop, value) {
        target[prop] = value;
        calls.push({ method: `set:${prop}`, args: [value] });
        return true;
      }
    }
  );
  return { ctx, calls };
}

test("computeLayout: derives plot rectangle from width/height/padding", () => {
  const layout = computeLayout({
    width: 200,
    height: 100,
    padding: { top: 10, right: 20, bottom: 5, left: 30 }
  });
  assert.deepEqual(layout, {
    left: 30,
    top: 10,
    right: 180,
    bottom: 95,
    width: 150,
    height: 85
  });
});

test("computeLayout: width/height clamp to a minimum of 1", () => {
  const layout = computeLayout({
    width: 10,
    height: 10,
    padding: { top: 50, right: 50, bottom: 50, left: 50 }
  });
  assert.equal(layout.width, 1);
  assert.equal(layout.height, 1);
});

test("makeStaticLayerKey: stable JSON of inputs and changes when inputs change", () => {
  const opts = { width: 1, height: 1, background: "#fff", grid: { show: true }, axes: { show: true } };
  const plot = { left: 0, top: 0, right: 1, bottom: 1, width: 1, height: 1 };
  const bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

  const a = makeStaticLayerKey(opts, plot, bounds);
  const b = makeStaticLayerKey(opts, plot, bounds);
  assert.equal(a, b);
  assert.equal(typeof a, "string");

  const a2 = makeStaticLayerKey({ ...opts, background: "#000" }, plot, bounds);
  assert.notEqual(a, a2);
});

test("drawLineSeries: no-op when series has no points", () => {
  const { ctx, calls } = createRecordingCtx();
  drawLineSeries(ctx, {}, { points: [], color: "#f00", lineWidth: 1, pointRadius: 0 }, () => 0, () => 0);
  assert.equal(calls.length, 0);
});

test("drawLineSeries: strokes a path through every point", () => {
  const { ctx, calls } = createRecordingCtx();
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 4 }
  ];
  drawLineSeries(ctx, {}, { points, color: "#3b82f6", lineWidth: 2, pointRadius: 0 }, (x) => x * 10, (y) => y * 10);

  assert.ok(calls.some((c) => c.method === "save"));
  assert.ok(calls.some((c) => c.method === "set:strokeStyle" && c.args[0] === "#3b82f6"));
  assert.ok(calls.some((c) => c.method === "set:lineWidth" && c.args[0] === 2));
  assert.ok(calls.some((c) => c.method === "beginPath"));
  const moves = calls.filter((c) => c.method === "moveTo");
  const lines = calls.filter((c) => c.method === "lineTo");
  assert.equal(moves.length, 1);
  assert.deepEqual(moves[0].args, [0, 0]);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0].args, [10, 10]);
  assert.deepEqual(lines[1].args, [20, 40]);
  assert.ok(calls.some((c) => c.method === "stroke"));
  assert.ok(calls.some((c) => c.method === "restore"));
});

test("drawLineSeries: draws point markers when pointRadius > 0", () => {
  const { ctx, calls } = createRecordingCtx();
  drawLineSeries(
    ctx,
    {},
    { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], color: "#f00", lineWidth: 1, pointRadius: 3 },
    (x) => x,
    (y) => y
  );
  const arcs = calls.filter((c) => c.method === "arc");
  const fills = calls.filter((c) => c.method === "fill");
  assert.equal(arcs.length, 2);
  assert.equal(fills.length, 2);
  for (const arc of arcs) {
    assert.equal(arc.args[2], 3, "uses series.pointRadius");
  }
});

test("drawBackdrop: fills full canvas with background color", () => {
  const { ctx, calls } = createRecordingCtx();
  drawBackdrop(ctx, { width: 50, height: 25, background: "#abcdef" });

  assert.ok(calls.some((c) => c.method === "save"));
  assert.ok(calls.some((c) => c.method === "set:fillStyle" && c.args[0] === "#abcdef"));
  const fillRect = calls.find((c) => c.method === "fillRect");
  assert.deepEqual(fillRect.args, [0, 0, 50, 25]);
  assert.ok(calls.some((c) => c.method === "restore"));
});

test("drawGrid: skips both grid and axes when both disabled", () => {
  const { ctx, calls } = createRecordingCtx();
  drawGrid(
    ctx,
    {
      grid: { show: false, color: "#eee", lineWidth: 1, xTicks: 5, yTicks: 5 },
      axes: { show: false, color: "#000", lineWidth: 1 }
    },
    { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
    { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  );
  assert.equal(calls.length, 0);
});

test("drawGrid: emits expected number of grid lines when grid.show=true", () => {
  const { ctx, calls } = createRecordingCtx();
  drawGrid(
    ctx,
    {
      grid: { show: true, color: "#eee", lineWidth: 1, xTicks: 4, yTicks: 2 },
      axes: { show: false, color: "#000", lineWidth: 1 }
    },
    { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
    { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  );
  // (xTicks+1)+(yTicks+1) = 5+3 = 8 line segments → 8 moveTo + 8 lineTo
  assert.equal(calls.filter((c) => c.method === "moveTo").length, 8);
  assert.equal(calls.filter((c) => c.method === "lineTo").length, 8);
});

test("drawGrid: draws axes through clamp(0, ...) inside the bounds", () => {
  const { ctx, calls } = createRecordingCtx();
  drawGrid(
    ctx,
    {
      grid: { show: false, color: "#eee", lineWidth: 1, xTicks: 5, yTicks: 5 },
      axes: { show: true, color: "#111", lineWidth: 2 }
    },
    { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
    { xMin: -1, xMax: 1, yMin: -1, yMax: 1 }
  );
  // Two axes → 2 moveTo + 2 lineTo, both crossing the midpoint (50, 50).
  const moves = calls.filter((c) => c.method === "moveTo");
  const lines = calls.filter((c) => c.method === "lineTo");
  assert.equal(moves.length, 2);
  assert.equal(lines.length, 2);
  assert.ok(calls.some((c) => c.method === "set:strokeStyle" && c.args[0] === "#111"));
});

test("createBufferCanvas: uses document.createElement when OffscreenCanvas is unavailable", () => {
  const previousDoc = globalThis.document;
  const previousOffscreen = globalThis.OffscreenCanvas;
  // eslint-disable-next-line no-undef
  delete globalThis.OffscreenCanvas;

  const created = [];
  globalThis.document = {
    createElement(tag) {
      const node = {
        tag,
        width: 0,
        height: 0,
        getContext() {
          return { setTransform() {} };
        }
      };
      created.push(node);
      return node;
    }
  };
  try {
    const out = createBufferCanvas(
      { scalability: { useOffscreenCanvas: true } },
      100,
      50,
      2
    );
    assert.ok(out.canvas);
    assert.equal(created.length, 1);
    assert.equal(created[0].width, 200);
    assert.equal(created[0].height, 100);
  } finally {
    if (previousDoc === undefined) delete globalThis.document;
    else globalThis.document = previousDoc;
    if (previousOffscreen !== undefined) globalThis.OffscreenCanvas = previousOffscreen;
  }
});

test("createBufferCanvas: returns nulls when no canvas backend is available", () => {
  const previousDoc = globalThis.document;
  const previousOffscreen = globalThis.OffscreenCanvas;
  // eslint-disable-next-line no-undef
  delete globalThis.OffscreenCanvas;
  // eslint-disable-next-line no-undef
  delete globalThis.document;

  try {
    const out = createBufferCanvas(
      { scalability: { useOffscreenCanvas: false } },
      10,
      10,
      1
    );
    assert.deepEqual(out, { canvas: null, ctx: null });
  } finally {
    if (previousDoc !== undefined) globalThis.document = previousDoc;
    if (previousOffscreen !== undefined) globalThis.OffscreenCanvas = previousOffscreen;
  }
});

test("createBufferCanvas: returns nulls when getContext('2d') yields null", () => {
  const previousDoc = globalThis.document;
  const previousOffscreen = globalThis.OffscreenCanvas;
  // eslint-disable-next-line no-undef
  delete globalThis.OffscreenCanvas;
  globalThis.document = {
    createElement() {
      return { width: 0, height: 0, getContext: () => null };
    }
  };
  try {
    const out = createBufferCanvas(
      { scalability: { useOffscreenCanvas: false } },
      10,
      10,
      1
    );
    assert.deepEqual(out, { canvas: null, ctx: null });
  } finally {
    if (previousDoc === undefined) delete globalThis.document;
    else globalThis.document = previousDoc;
    if (previousOffscreen !== undefined) globalThis.OffscreenCanvas = previousOffscreen;
  }
});

test("createBufferCanvas: returns nulls when OffscreenCanvas getContext yields null", () => {
  const previousOffscreen = globalThis.OffscreenCanvas;
  class FakeOffscreen {
    constructor(w, h) { this.width = w; this.height = h; }
    getContext() { return null; }
  }
  globalThis.OffscreenCanvas = FakeOffscreen;
  try {
    const out = createBufferCanvas(
      { scalability: { useOffscreenCanvas: true } },
      40,
      20,
      1
    );
    assert.deepEqual(out, { canvas: null, ctx: null });
  } finally {
    if (previousOffscreen === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = previousOffscreen;
  }
});

test("createBufferCanvas: uses OffscreenCanvas when available and enabled", () => {
  const previousOffscreen = globalThis.OffscreenCanvas;
  let constructed = null;
  class FakeOffscreen {
    constructor(w, h) {
      constructed = { w, h };
      this.width = w;
      this.height = h;
    }
    getContext() {
      return { setTransform() {} };
    }
  }
  globalThis.OffscreenCanvas = FakeOffscreen;
  try {
    const out = createBufferCanvas(
      { scalability: { useOffscreenCanvas: true } },
      80,
      40,
      2
    );
    assert.ok(out.canvas instanceof FakeOffscreen);
    assert.deepEqual(constructed, { w: 160, h: 80 });
  } finally {
    if (previousOffscreen === undefined) delete globalThis.OffscreenCanvas;
    else globalThis.OffscreenCanvas = previousOffscreen;
  }
});
