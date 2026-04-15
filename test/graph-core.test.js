import test from "node:test";
import assert from "node:assert/strict";

import { Graph } from "../src/core/Graph.js";
import { normalizeSeriesData, decimatePointsStride } from "../src/core/utils.js";
import { ErrorBoundary } from "../src/core/ErrorBoundary.js";

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

test("Graph.registerSampler: registered sampler is used during _getRenderableSeries", () => {
  const calls = [];
  const mockSampler = (points, maxPoints) => {
    calls.push({ count: points.length, maxPoints });
    return points.slice(0, maxPoints);
  };

  Graph.registerSampler("mock-sampler", mockSampler);

  const graph = createGraph({
    sampling: { enabled: true, maxPoints: 2, method: "mock-sampler" }
  });

  const series = { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }] };
  const result = graph._getRenderableSeries(series);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].count, 4);
  assert.equal(calls[0].maxPoints, 2);
  assert.equal(result.points.length, 2);

  // Cleanup
  Graph.samplers.delete("mock-sampler");
});

test("Graph.registerSampler: trims whitespace from name on registration and lookup", () => {
  Graph.registerSampler("  padded  ", () => []);
  assert.ok(Graph.samplers.has("padded"), "sampler stored under trimmed key");
  Graph.samplers.delete("padded");
});

test("Graph._getRenderableSeries: unknown sampler method returns series unchanged", () => {
  const graph = createGraph({
    sampling: { enabled: true, maxPoints: 2, method: "nonexistent-sampler" }
  });

  const series = { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }] };
  const result = graph._getRenderableSeries(series);

  assert.strictEqual(result, series, "series returned unchanged when sampler is not found");
});

test("normalizeSeriesData applies options.series defaults to series missing fields", () => {
  const raw = [{ id: "s1", points: [{ x: 0, y: 1 }] }];
  const defaults = { type: "bar", color: "#ff0000", lineWidth: 3, pointRadius: 5 };

  const [series] = normalizeSeriesData(raw, defaults);

  assert.equal(series.type, "bar");
  assert.equal(series.color, "#ff0000");
  assert.equal(series.lineWidth, 3);
  assert.equal(series.pointRadius, 5);
});

test("normalizeSeriesData: per-series values take precedence over options.series defaults", () => {
  const raw = [{ id: "s1", type: "scatter", color: "#00ff00", lineWidth: 1, pointRadius: 2, points: [] }];
  const defaults = { type: "bar", color: "#ff0000", lineWidth: 3, pointRadius: 5 };

  const [series] = normalizeSeriesData(raw, defaults);

  assert.equal(series.type, "scatter");
  assert.equal(series.color, "#00ff00");
  assert.equal(series.lineWidth, 1);
  assert.equal(series.pointRadius, 2);
});

test("ErrorBoundary.configure: partial update preserves untouched fields", () => {
  const boundary = new ErrorBoundary({ enabled: false, onError: null });
  const handler = () => {};

  // Update only onError — enabled should remain false
  boundary.configure({ onError: handler });
  assert.equal(boundary.enabled, false, "enabled should not change when omitted from configure()");
  assert.strictEqual(boundary.onError, handler);

  // Update only enabled — onError should remain
  boundary.configure({ enabled: true });
  assert.equal(boundary.enabled, true);
  assert.strictEqual(boundary.onError, handler, "onError should not change when omitted from configure()");
});

test("decimatePointsStride: output length never exceeds maxPoints", () => {
  const points = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }));

  for (const maxPoints of [2, 3, 5, 9]) {
    const result = decimatePointsStride(points, maxPoints);
    assert.ok(
      result.length <= maxPoints,
      `expected length <= ${maxPoints}, got ${result.length}`
    );
  }
});

test("decimatePointsStride: output always ends with the last input point", () => {
  const points = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }));
  const last = points[points.length - 1];

  for (const maxPoints of [2, 3, 5]) {
    const result = decimatePointsStride(points, maxPoints);
    assert.strictEqual(result[result.length - 1], last, `last point must be preserved for maxPoints=${maxPoints}`);
  }
});

test("decimatePointsStride: returns input unchanged when points.length <= maxPoints", () => {
  const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  assert.strictEqual(decimatePointsStride(points, 5), points);
  assert.strictEqual(decimatePointsStride(points, 2), points);
});
