import test from "node:test";
import assert from "node:assert/strict";

import { panZoomPlugin } from "../extensions/pan-zoom/index.js";

function createPanZoomHarness() {
  let state = {};
  const registeredCommands = new Map();

  const graph = {
    renderCount: 0,
    render() {
      this.renderCount += 1;
    },
    canvas: {
      addEventListener() {},
      removeEventListener() {},
      getBoundingClientRect() {
        return { left: 0, top: 0 };
      }
    }
  };

  const api = {
    id: "pan-zoom",
    getPluginState() {
      return state;
    },
    setState(partialState) {
      const current = state || {};
      state = { ...current, ...partialState };
    },
    registerCommand(commandName, handler) {
      registeredCommands.set(commandName, handler);
      return `pan-zoom.${commandName}`;
    },
    requestRender() {
      graph.render();
    }
  };

  return {
    graph,
    api,
    options: {
      enabled: true,
      zoomStep: 0.12,
      minSpanX: 0.0001,
      minSpanY: 0.0001
    },
    getState() {
      return state;
    },
    getCommand(name) {
      return registeredCommands.get(name);
    }
  };
}

test("pan-zoom install wires commands and resetView resets viewport", () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {}
  };

  try {
    const harness = createPanZoomHarness();
    panZoomPlugin.install(harness.graph, harness.options, harness.api);

    harness.api.setState({ view: { xMin: 1, xMax: 2, yMin: 3, yMax: 4 } });

    const resetView = harness.getCommand("resetView");
    assert.equal(typeof resetView, "function");

    const result = resetView();
    assert.deepEqual(result, { reset: true });
    assert.equal(harness.getState().view, null);
    assert.equal(harness.graph.renderCount, 1);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("pan-zoom beforeRender applies stored view bounds", () => {
  const state = {
    view: {
      xMin: 10,
      xMax: 20,
      yMin: 30,
      yMax: 40
    }
  };

  const context = {
    bounds: {
      xMin: 0,
      xMax: 100,
      yMin: 0,
      yMax: 100
    }
  };

  panZoomPlugin.hooks.beforeRender(
    { canvas: {} },
    context,
    { enabled: true },
    {
      getPluginState() {
        return state;
      },
      setState() {}
    }
  );

  assert.deepEqual(context.bounds, {
    xMin: 10,
    xMax: 20,
    yMin: 30,
    yMax: 40
  });
});
