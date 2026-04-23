import test from "node:test";
import assert from "node:assert/strict";

import { Graph } from "../src/core/Graph.js";

function createCanvasStub() {
  const calls = { drawImage: 0, fillRect: 0, clearRect: 0, stroke: 0 };
  const ctx = {
    setTransform() {},
    clearRect() { calls.clearRect += 1; },
    save() {},
    restore() {},
    fillRect() { calls.fillRect += 1; },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() { calls.stroke += 1; },
    arc() {},
    fill() {},
    drawImage() { calls.drawImage += 1; },
    setLineDash() {},
    fillText() {},
    measureText() { return { width: 0 }; }
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext(kind) { return kind === "2d" ? ctx : null; }
  };
  return { canvas, ctx, calls };
}

function createGraph(options = {}) {
  const stub = createCanvasStub();
  return { graph: new Graph(stub.canvas, { plugins: [], ...options }), stub };
}

// ---------------------------------------------------------------------------
// Static registrars
// ---------------------------------------------------------------------------

test("Graph.registerRenderer: validates type and function arguments", () => {
  assert.throws(() => Graph.registerRenderer("", () => {}), /non-empty string/);
  assert.throws(() => Graph.registerRenderer("   ", () => {}), /non-empty string/);
  assert.throws(() => Graph.registerRenderer("ok", null), /must be a function/);
});

test("Graph.registerSampler: validates name and function arguments", () => {
  assert.throws(() => Graph.registerSampler("", () => []), /non-empty string/);
  assert.throws(() => Graph.registerSampler("ok", null), /must be a function/);
});

test("Graph static registry: registerPlugin / unregisterPlugin", () => {
  const plugin = { id: "static-test-plugin" };
  Graph.registerPlugin(plugin);
  assert.strictEqual(Graph.registry.getPlugin("static-test-plugin"), plugin);
  Graph.unregisterPlugin("static-test-plugin");
  assert.equal(Graph.registry.getPlugin("static-test-plugin"), undefined);
});

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

test("Graph constructor: throws when canvas has no 2D context", () => {
  const fake = { width: 0, height: 0, style: {}, getContext: () => null };
  assert.throws(() => new Graph(fake, { plugins: [] }), /Could not acquire a 2D context/);
});

test("Graph constructor: applies provided options on top of defaults", () => {
  const { graph } = createGraph({ width: 100, height: 50, background: "#000" });
  assert.equal(graph.options.width, 100);
  assert.equal(graph.options.height, 50);
  assert.equal(graph.options.background, "#000");
  // Defaults remain
  assert.equal(graph.options.padding.top, 24);
});

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

test("Graph.setData: normalizes input and toggles dirty flags", () => {
  const { graph } = createGraph();
  graph._dirty &= ~1;  // clear DIRTY_DATA
  graph._dirty &= ~8;  // clear DIRTY_RENDER
  graph.setData([{ id: "s1", points: [{ x: 0, y: 0 }, { x: 1, y: 2 }] }]);
  assert.equal(graph.data.length, 1);
  assert.equal(graph.data[0].id, "s1");
  assert.ok(graph._dirty & 1, "DIRTY_DATA bit should be set");
  assert.ok(graph._dirty & 8, "DIRTY_RENDER bit should be set");
});

test("Graph.setData: returning false from beforeSetData short-circuits", () => {
  const { graph } = createGraph();
  graph.plugins.call = (name) => (name === "beforeSetData" ? false : true);
  const before = graph.data;
  graph.setData([{ points: [{ x: 0, y: 0 }] }]);
  assert.strictEqual(graph.data, before, "data unchanged when beforeSetData returns false");
});

test("Graph.setData: deep-freezes data when immutableInputs is true", () => {
  const { graph } = createGraph({ immutableInputs: true });
  graph.setData([{ points: [{ x: 0, y: 0 }] }]);
  assert.ok(Object.isFrozen(graph.data));
  assert.ok(Object.isFrozen(graph.data[0]));
});

test("Graph.addSeries: appends a series and re-normalizes data", () => {
  const { graph } = createGraph();
  graph.setData([{ id: "a", points: [] }]);
  graph.addSeries({ id: "b", points: [{ x: 0, y: 0 }] });
  assert.deepEqual(graph.data.map((s) => s.id), ["a", "b"]);
});

// ---------------------------------------------------------------------------
// Resize / clear / destroy
// ---------------------------------------------------------------------------

test("Graph.resize: clamps to a minimum of 1x1 and updates options", () => {
  const { graph, stub } = createGraph();
  graph.resize(0, 0);
  assert.equal(graph.options.width, 1);
  assert.equal(graph.options.height, 1);
  assert.equal(stub.canvas.width, 1);
  assert.equal(stub.canvas.height, 1);
});

test("Graph.resize: returning false from beforeResize short-circuits", () => {
  const { graph, stub } = createGraph({ width: 100, height: 50 });
  graph.plugins.call = (name) => (name === "beforeResize" ? false : true);
  const previousW = stub.canvas.width;
  graph.resize(999, 999);
  assert.equal(stub.canvas.width, previousW, "canvas dimensions unchanged");
});

test("Graph.clear: clears the canvas", () => {
  const { graph, stub } = createGraph();
  const before = stub.calls.clearRect;
  graph.clear();
  assert.equal(stub.calls.clearRect, before + 1);
});

test("Graph.destroy: marks instance destroyed and is idempotent", () => {
  const { graph } = createGraph();
  graph.destroy();
  assert.equal(graph._destroyed, true);
  // Calling again is a no-op
  assert.doesNotThrow(() => graph.destroy());
  // render after destroy throws
  assert.throws(() => graph.render({ force: true }), /destroyed graph/);
});

// ---------------------------------------------------------------------------
// Options / domain
// ---------------------------------------------------------------------------

test("Graph.setOptions: deep-merges and reapplies validation", () => {
  const { graph } = createGraph();
  graph.setOptions({ background: "#abc", grid: { xTicks: 8 } });
  assert.equal(graph.options.background, "#abc");
  assert.equal(graph.options.grid.xTicks, 8);
  assert.equal(graph.options.grid.yTicks, 5, "untouched grid options preserved");
});

test("Graph.setOptions: passing domain:null via setOptions clears the domain", () => {
  const { graph } = createGraph({ domain: { xMin: 0, xMax: 10 } });
  assert.deepEqual(graph.getDomain(), { xMin: 0, xMax: 10 });
  graph.setOptions({ domain: null });
  assert.equal(graph.getDomain(), null);
});

test("Graph.setOptions: reconfigures the plugin error boundary when provided", () => {
  const { graph } = createGraph();
  let captured = null;
  graph.setOptions({
    pluginErrorBoundary: {
      enabled: true,
      onError(args) { captured = args; }
    }
  });
  // Trigger an error through the boundary directly
  graph.plugins._errorBoundary.handle("p", "phase", new Error("e"));
  assert.equal(captured.pluginId, "p");
});

test("Graph.setOptions: providing plugins array reconfigures plugin host", () => {
  const { graph } = createGraph();
  let installed = false;
  graph.setOptions({
    plugins: [{ plugin: { id: "inline", install() { installed = true; } } }]
  });
  assert.equal(installed, true);
});

test("Graph.getOptions: returns a defensive copy", () => {
  const { graph } = createGraph();
  const a = graph.getOptions();
  const b = graph.getOptions();
  assert.notStrictEqual(a, b);
  a.width = 9999;
  assert.notEqual(graph.options.width, 9999);
});

test("Graph.setBoundsStrategy: stores strategy and validates argument", () => {
  const { graph } = createGraph();
  const strategy = (data) => ({ ...data, xMin: -100 });
  graph.setBoundsStrategy(strategy);
  assert.strictEqual(graph._boundsStrategy, strategy);
  graph.setBoundsStrategy(null);
  assert.equal(graph._boundsStrategy, null);
  assert.throws(() => graph.setBoundsStrategy("nope"), /requires a function or null/);
});

test("Graph._resolveBounds: uses bounds strategy when set", () => {
  const { graph } = createGraph();
  const data = { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  graph.setBoundsStrategy(() => ({ xMin: -1, xMax: 2, yMin: -1, yMax: 2 }));
  assert.deepEqual(graph._resolveBounds(data), { xMin: -1, xMax: 2, yMin: -1, yMax: 2 });
});

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

test("Graph.listCommands / unregisterCommand / clearPluginCommands", () => {
  const { graph } = createGraph();
  graph.registerCommand("a.one", () => "1", { description: "d1" }, "a");
  graph.registerCommand("a.two", () => "2", {}, "a");
  graph.registerCommand("b.one", () => "1", {}, "b");

  const commands = graph.listCommands();
  assert.equal(commands.length, 3);
  const found = commands.find((c) => c.name === "a.one");
  assert.equal(found.metadata.description, "d1");
  assert.equal(found.pluginId, "a");

  graph.unregisterCommand("a.two");
  assert.equal(graph.listCommands().length, 2);
  assert.equal(graph.commands.has("a.two"), false);

  graph.clearPluginCommands("a");
  assert.equal(graph.listCommands().length, 1);
  assert.equal(graph.listCommands()[0].pluginId, "b");
});

// ---------------------------------------------------------------------------
// Render integration
// ---------------------------------------------------------------------------

test("Graph.render: completes a full pipeline and clears dirty flags", () => {
  const { graph, stub } = createGraph({
    width: 100,
    height: 100,
    scalability: { dirtyRender: true, layerCaching: false, useOffscreenCanvas: false }
  });
  graph.setData([{ id: "s", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]);
  const result = graph.render();
  assert.strictEqual(result, graph);
  assert.equal(graph._dirty, 0, "all dirty bits should be cleared after render");
  assert.ok(stub.calls.stroke > 0, "line series was drawn");

  // Subsequent render with no dirty flags is a no-op
  const strokeBefore = stub.calls.stroke;
  graph.render();
  assert.equal(stub.calls.stroke, strokeBefore);

  // force: true bypasses dirty short-circuit
  graph.render({ force: true });
  assert.ok(stub.calls.stroke > strokeBefore);
});

test("Graph.render: layer caching uses an offscreen-style buffer when document is available", () => {
  const previousDoc = globalThis.document;
  const previousOffscreen = globalThis.OffscreenCanvas;
  // eslint-disable-next-line no-undef
  delete globalThis.OffscreenCanvas;
  globalThis.document = {
    createElement() {
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            setTransform() {},
            save() {},
            restore() {},
            fillRect() {},
            beginPath() {},
            moveTo() {},
            lineTo() {},
            stroke() {}
          };
        }
      };
    }
  };
  try {
    const { graph, stub } = createGraph({
      width: 80,
      height: 60,
      scalability: { dirtyRender: false, layerCaching: true, useOffscreenCanvas: false }
    });
    graph.setData([{ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]);
    graph.render();
    assert.ok(stub.calls.drawImage >= 1, "static layer was composited via drawImage");
    // Render again — cached layer should be reused (key match), still results in drawImage.
    const before = stub.calls.drawImage;
    graph.render({ force: true });
    assert.ok(stub.calls.drawImage > before);
  } finally {
    if (previousDoc === undefined) delete globalThis.document;
    else globalThis.document = previousDoc;
    if (previousOffscreen !== undefined) globalThis.OffscreenCanvas = previousOffscreen;
  }
});

test("Graph.render: returning false from beforeLayout/beforeRender short-circuits", () => {
  const { graph, stub } = createGraph();
  graph.setData([{ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]);

  // Replace plugins.call with a controllable stub.
  let blockHook = "beforeLayout";
  graph.plugins.call = (name) => name !== blockHook;
  const before = stub.calls.stroke;
  graph.render({ force: true });
  assert.equal(stub.calls.stroke, before, "no series drawn when beforeLayout returns false");

  blockHook = "beforeRender";
  graph.render({ force: true });
  assert.equal(stub.calls.stroke, before, "no series drawn when beforeRender returns false");
});

test("Graph.render: beforeLayout fires before _computeLayout and plugin can override layout", () => {
  const { graph } = createGraph({
    width: 200,
    height: 200,
    scalability: { dirtyRender: false, layerCaching: false, useOffscreenCanvas: false }
  });

  let computeLayoutCalled = false;
  const originalCompute = graph._computeLayout.bind(graph);
  graph._computeLayout = () => {
    computeLayoutCalled = true;
    return originalCompute();
  };

  let capturedPayloadAtHookTime = null;
  const customLayout = {
    left: 5,
    right: 195,
    top: 5,
    bottom: 195,
    width: 190,
    height: 190
  };

  graph.plugins.configure([
    {
      name: "layout-override-test-plugin",
      beforeLayout(payload) {
        // Verify _computeLayout has NOT been called yet
        capturedPayloadAtHookTime = { computeLayoutCalledBeforeHook: computeLayoutCalled };
        // Plugin overrides the layout
        payload.layout = customLayout;
      }
    }
  ]);

  graph.setData([{ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]);
  graph.render({ force: true });

  assert.ok(capturedPayloadAtHookTime !== null, "beforeLayout hook was called");
  assert.equal(
    capturedPayloadAtHookTime.computeLayoutCalledBeforeHook,
    false,
    "beforeLayout fires before _computeLayout"
  );
  assert.equal(
    computeLayoutCalled,
    false,
    "_computeLayout is skipped when plugin provides payload.layout"
  );
});

test("Graph.render: falls back to direct draw when layer caching is on but no canvas backend exists", () => {
  // No global `document` and no `OffscreenCanvas` → createBufferCanvas returns
  // {canvas: null, ctx: null}, so _drawStaticLayer must fall through to
  // drawing the backdrop and grid directly on the main context.
  const previousDoc = globalThis.document;
  const previousOffscreen = globalThis.OffscreenCanvas;
  // eslint-disable-next-line no-undef
  delete globalThis.OffscreenCanvas;
  // eslint-disable-next-line no-undef
  delete globalThis.document;
  try {
    const { graph, stub } = createGraph({
      width: 60,
      height: 40,
      scalability: { dirtyRender: false, layerCaching: true, useOffscreenCanvas: false }
    });
    graph.setData([{ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }]);
    graph.render();
    // Backdrop fillRect is invoked even though no buffer canvas was created.
    assert.ok(stub.calls.fillRect >= 1, "backdrop drawn directly when buffer is null");
    assert.equal(stub.calls.drawImage, 0, "no drawImage when buffer is null");
  } finally {
    if (previousDoc !== undefined) globalThis.document = previousDoc;
    if (previousOffscreen !== undefined) globalThis.OffscreenCanvas = previousOffscreen;
  }
});

test("Graph.render: returning false from beforeDrawSeries skips that series", () => {
  // Disable grid/axes so each call to ctx.stroke() corresponds to a series.
  const { graph, stub } = createGraph({
    scalability: { dirtyRender: false, layerCaching: false, useOffscreenCanvas: false },
    grid: { show: false, color: "#eee", lineWidth: 1, xTicks: 5, yTicks: 5 },
    axes: { show: false, color: "#000", lineWidth: 1 }
  });
  graph.setData([
    { id: "skip", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    { id: "draw", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }
  ]);
  graph.plugins.call = (name, ctx) => {
    if (name === "beforeDrawSeries" && ctx?.series?.id === "skip") return false;
    return true;
  };
  const before = stub.calls.stroke;
  graph.render({ force: true });
  assert.equal(stub.calls.stroke - before, 1, "only the non-skipped series was drawn");
});

test("Graph.render: respects series.visible=false", () => {
  // Disable grid/axes so each call to ctx.stroke() corresponds to a series.
  const { graph, stub } = createGraph({
    scalability: { dirtyRender: false, layerCaching: false, useOffscreenCanvas: false },
    grid: { show: false, color: "#eee", lineWidth: 1, xTicks: 5, yTicks: 5 },
    axes: { show: false, color: "#000", lineWidth: 1 }
  });
  graph.setData([
    { id: "hidden", visible: false, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    { id: "shown", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }
  ]);
  const before = stub.calls.stroke;
  graph.render({ force: true });
  assert.equal(stub.calls.stroke - before, 1);
});
