import test from "node:test";
import assert from "node:assert/strict";

import { Graph } from "../src/core/Graph.js";

function createCanvasStub() {
  const ctx = {
    setTransform() {},
    clearRect() {},
    save() {},
    restore() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
    drawImage() {},
    setLineDash() {},
    fillText() {},
    measureText() {
      return { width: 0 };
    }
  };

  return {
    width: 0,
    height: 0,
    style: {},
    getContext(kind) {
      return kind === "2d" ? ctx : null;
    }
  };
}

function createGraph(options = {}) {
  return new Graph(createCanvasStub(), {
    plugins: [],
    ...options
  });
}

test("Graph command registration edge cases: invalid input and normalization", () => {
  const graph = createGraph();

  assert.throws(
    () => graph.registerCommand("", () => {}),
    /Command name must be a non-empty string\./
  );

  assert.throws(
    () => graph.registerCommand("ok", null),
    /must be a function\./
  );

  const nameA = graph.registerCommand("ping", () => "pong", { description: "x" }, "pluginA");
  const nameB = graph.registerCommand("pluginA.pong", () => "pong", {}, "pluginA");

  assert.equal(nameA, "pluginA.ping");
  assert.equal(nameB, "pluginA.pong");

  assert.equal(graph.executeCommand("pluginA.ping"), "pong");

  assert.throws(
    () => graph.executeCommand("missing.command"),
    /Unknown command: missing\.command/
  );
});

test("setDomain validation boundaries: accepts valid domains and rejects invalid ranges", () => {
  const graph = createGraph();

  graph.setDomain({ xMin: 0, xMax: 100, yMin: -1, yMax: 1 });
  assert.deepEqual(graph.getDomain(), { xMin: 0, xMax: 100, yMin: -1, yMax: 1 });

  graph.setDomain({ xMin: 10, xMax: 20 });
  assert.deepEqual(graph.getDomain(), { xMin: 10, xMax: 20 });

  assert.throws(
    () => graph.setDomain({ xMin: 5, xMax: 5 }),
    /xMin < xMax/
  );

  assert.throws(
    () => graph.setDomain({ yMin: 2, yMax: 2 }),
    /yMin < yMax/
  );

  assert.throws(
    () => graph.setDomain({ xMin: Number.NaN }),
    /must be a finite number/
  );

  graph.clearDomain();
  assert.equal(graph.getDomain(), null);
});
