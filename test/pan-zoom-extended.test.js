import test from "node:test";
import assert from "node:assert/strict";

import { panZoomPlugin } from "../extensions/pan-zoom/index.js";

/**
 * Build a harness that captures DOM event listeners so we can fire synthetic
 * pointer events at the plugin without a real DOM.
 *
 * Uses a single shared state object whose properties are mutated in place,
 * matching how the plugin's install closure captures `state` by reference.
 */
function createHarness(initialOptions = {}) {
  const canvasListeners = new Map();
  const windowListeners = new Map();

  const canvas = {
    addEventListener(name, handler) { canvasListeners.set(name, handler); },
    removeEventListener(name) { canvasListeners.delete(name); },
    getBoundingClientRect() { return { left: 0, top: 0 }; }
  };

  const graph = {
    canvas,
    renderCount: 0,
    render() { this.renderCount += 1; }
  };

  const previousWindow = globalThis.window;
  globalThis.window = {
    addEventListener(name, handler) { windowListeners.set(name, handler); },
    removeEventListener(name) { windowListeners.delete(name); }
  };

  // Single shared state object; setState merges in place so install/hook
  // closures both see the same data.
  const state = {};
  const api = {
    id: "pan-zoom",
    getPluginState() { return state; },
    setState(partial) { Object.assign(state, partial); },
    registerCommand() { return "noop"; },
    requestRender() { graph.render(); }
  };

  const options = {
    enabled: true,
    zoomStep: 0.5,
    minZoomStep: 0.01,
    maxZoomStep: 0.8,
    minSpanX: 0.0001,
    minSpanY: 0.0001,
    ...initialOptions
  };

  panZoomPlugin.install(graph, options, api);

  const layout = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  const bounds = { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };

  // Drive afterLayout to populate state.layout/bounds/view.
  panZoomPlugin.hooks.afterLayout(graph, { layout, bounds }, options, api);

  return {
    graph,
    api,
    options,
    canvasListeners,
    windowListeners,
    layout,
    bounds,
    getState: () => state,
    restore() {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  };
}

test("pan-zoom afterLayout: initializes view from bounds when none exists", () => {
  const h = createHarness();
  try {
    assert.deepEqual(h.getState().view, h.bounds);
  } finally {
    h.restore();
  }
});

test("pan-zoom wheel: zooms in (deltaY<0) shrinks the view span", () => {
  const h = createHarness();
  try {
    const wheel = h.canvasListeners.get("wheel");
    assert.equal(typeof wheel, "function");

    const prevented = { count: 0 };
    wheel({
      clientX: 50,
      clientY: 50,
      deltaY: -1,
      preventDefault() { prevented.count += 1; }
    });
    assert.equal(prevented.count, 1, "preventDefault was called");
    const view = h.getState().view;
    const span = view.xMax - view.xMin;
    assert.ok(span < 100, "view span shrank after zoom in");
    assert.equal(h.graph.renderCount, 1);
  } finally {
    h.restore();
  }
});

test("pan-zoom wheel: zooming out (deltaY>0) expands the view span", () => {
  const h = createHarness();
  try {
    // Start from a smaller view so we have room to expand.
    h.api.setState({ view: { xMin: 25, xMax: 75, yMin: 25, yMax: 75 } });
    const wheel = h.canvasListeners.get("wheel");
    wheel({ clientX: 50, clientY: 50, deltaY: 1, preventDefault() {} });
    const view = h.getState().view;
    const span = view.xMax - view.xMin;
    assert.ok(span > 50, `expected span to grow from 50, got ${span}`);
  } finally {
    h.restore();
  }
});

test("pan-zoom wheel: ignored when pointer is outside the plot area", () => {
  const h = createHarness();
  try {
    const wheel = h.canvasListeners.get("wheel");
    const before = h.getState().view;
    wheel({ clientX: -5, clientY: -5, deltaY: -1, preventDefault() {} });
    assert.deepEqual(h.getState().view, before, "view unchanged for out-of-bounds wheel");
    assert.equal(h.graph.renderCount, 0);
  } finally {
    h.restore();
  }
});

test("pan-zoom wheel: ignored when plugin is disabled", () => {
  const h = createHarness({ enabled: false });
  try {
    const wheel = h.canvasListeners.get("wheel");
    const before = h.getState().view;
    wheel({ clientX: 50, clientY: 50, deltaY: -1, preventDefault() {} });
    assert.deepEqual(h.getState().view, before);
  } finally {
    h.restore();
  }
});

test("pan-zoom drag: mousedown + mousemove + mouseup pans the view", () => {
  const h = createHarness();
  try {
    const down = h.canvasListeners.get("mousedown");
    const move = h.canvasListeners.get("mousemove");
    const up = h.windowListeners.get("mouseup");
    assert.equal(typeof down, "function");
    assert.equal(typeof move, "function");
    assert.equal(typeof up, "function");

    down({ clientX: 50, clientY: 50, button: 0 });
    assert.equal(h.getState().pointerDown, true);

    // Move 10px right, 10px down. Plot is 100x100 over a 100x100 domain →
    // dx=10 → dDomainX = -10 (pan left). dy=10 → dDomainY = +10 (pan up).
    // Since view starts at full bounds, clampBounds will pin it back.
    move({ clientX: 60, clientY: 60, button: 0 });
    const view = h.getState().view;
    assert.ok(view.xMin >= 0 && view.xMax <= 100, "view stays clamped to bounds");

    up();
    assert.equal(h.getState().pointerDown, false);
    assert.equal(h.getState().lastMouse, null);
  } finally {
    h.restore();
  }
});

test("pan-zoom drag: actually pans within an inset view (no clamping snap-back)", () => {
  const h = createHarness();
  try {
    // Set a smaller centered view so panning has room to move.
    h.api.setState({ view: { xMin: 20, xMax: 60, yMin: 20, yMax: 60 } });

    const down = h.canvasListeners.get("mousedown");
    const move = h.canvasListeners.get("mousemove");

    down({ clientX: 50, clientY: 50, button: 0 });
    move({ clientX: 60, clientY: 50, button: 0 });

    const view = h.getState().view;
    // dx=10 → dDomainX = -(10/100)*40 = -4, so view shifts left by 4.
    assert.ok(view.xMin < 20 || Math.abs(view.xMin - 16) < 1e-6);
  } finally {
    h.restore();
  }
});

test("pan-zoom drag: mousedown ignored for non-primary button", () => {
  const h = createHarness();
  try {
    const down = h.canvasListeners.get("mousedown");
    down({ clientX: 50, clientY: 50, button: 2 });
    // pointerDown is initialized to false in install() and must remain false.
    assert.equal(h.getState().pointerDown, false);
  } finally {
    h.restore();
  }
});

test("pan-zoom drag: mousedown ignored when pointer is outside the plot area", () => {
  const h = createHarness();
  try {
    const down = h.canvasListeners.get("mousedown");
    down({ clientX: -10, clientY: -10, button: 0 });
    assert.equal(h.getState().pointerDown, false);
  } finally {
    h.restore();
  }
});

test("pan-zoom drag: mousemove is a no-op when pointerDown is false", () => {
  const h = createHarness();
  try {
    const move = h.canvasListeners.get("mousemove");
    const before = h.getState().view;
    move({ clientX: 60, clientY: 60, button: 0 });
    assert.deepEqual(h.getState().view, before);
    assert.equal(h.graph.renderCount, 0);
  } finally {
    h.restore();
  }
});

test("pan-zoom beforeSetData: clears the stored view", () => {
  const h = createHarness();
  try {
    h.api.setState({ view: { xMin: 1, xMax: 2, yMin: 3, yMax: 4 } });
    panZoomPlugin.hooks.beforeSetData(h.graph, {}, h.options, h.api);
    assert.equal(h.getState().view, null);
  } finally {
    h.restore();
  }
});

test("pan-zoom beforeRender: no-op when plugin is disabled", () => {
  const h = createHarness({ enabled: false });
  try {
    const ctx = { bounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 } };
    h.api.setState({ view: { xMin: 5, xMax: 10, yMin: 5, yMax: 10 } });
    panZoomPlugin.hooks.beforeRender(h.graph, ctx, { enabled: false }, h.api);
    assert.deepEqual(ctx.bounds, { xMin: 0, xMax: 100, yMin: 0, yMax: 100 });
  } finally {
    h.restore();
  }
});

test("pan-zoom beforeDestroy: removes registered DOM listeners", () => {
  const h = createHarness();
  try {
    panZoomPlugin.hooks.beforeDestroy(h.graph, {}, h.options, h.api);
    // After teardown the canvas/window listener maps no longer reference
    // the plugin's wheel/down/move/up handlers.
    assert.equal(h.canvasListeners.has("wheel"), false);
    assert.equal(h.canvasListeners.has("mousedown"), false);
    assert.equal(h.canvasListeners.has("mousemove"), false);
    assert.equal(h.windowListeners.has("mouseup"), false);
  } finally {
    h.restore();
  }
});
