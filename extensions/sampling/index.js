/**
 * First-party sampling extension for GraphJS.
 *
 * Registers six data-reduction samplers (LTTB, M4, RDP, LTD, LTOB, SMA) with
 * the global Graph sampler registry so they can be referenced by name in series
 * sampling options. Common helper functions shared by multiple samplers are kept
 * in the `./common` subpackage.
 */
import { triangleArea, splitBuckets } from "./common.js";

// ---------------------------------------------------------------------------
// LTTB – Largest-Triangle-Three-Buckets
// Shared: triangleArea, splitBuckets
// ---------------------------------------------------------------------------

function assertSorted(points, name) {
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].x < points[i - 1].x) {
      throw new Error(`Sampler '${name}' requires points sorted by ascending x.`);
    }
  }
}

/**
 * Largest-Triangle-Three-Buckets downsampling.
 *
 * Splits the interior of the series into equal-sized buckets and, for each
 * bucket, selects the point that forms the largest triangle with the previously
 * selected point and the centroid of the following bucket. Preserves the visual
 * shape of the series better than stride-based decimation.
 *
 * @param {{x:number,y:number}[]} points - Source points (must be sorted by x).
 * @param {number} maxPoints - Target output length.
 * @returns {{x:number,y:number}[]}
 */
export function lttb(points, maxPoints) {
  assertSorted(points, "lttb");
  if (maxPoints >= points.length || maxPoints < 3) return points.slice();

  const n = points.length;
  const buckets = splitBuckets(points.slice(1, n - 1), maxPoints - 2);
  const sampled = [points[0]];
  let prev = points[0];

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    if (bucket.length === 0) continue;

    // Centroid of the next bucket (or the final point when on the last bucket)
    const nextBucket = i < buckets.length - 1 ? buckets[i + 1] : [points[n - 1]];
    let avgX = 0, avgY = 0;
    for (const p of nextBucket) { avgX += p.x; avgY += p.y; }
    avgX /= nextBucket.length;
    avgY /= nextBucket.length;
    const avg = { x: avgX, y: avgY };

    let maxArea = -1, selected = bucket[0];
    for (const p of bucket) {
      const area = triangleArea(prev, p, avg);
      if (area > maxArea) { maxArea = area; selected = p; }
    }
    sampled.push(selected);
    prev = selected;
  }

  sampled.push(points[n - 1]);
  return sampled;
}

// ---------------------------------------------------------------------------
// M4 – MinMax (min-max / max-min)
// Shared: splitBuckets
// ---------------------------------------------------------------------------

/**
 * M4 (min-max max-min) downsampling.
 *
 * Divides the series into `floor(maxPoints / 4)` buckets. Each bucket
 * contributes up to four representative points (first, last, min-y, max-y),
 * deduplicated and ordered by x. This guarantees that visual extremes (spikes,
 * dips) are never lost regardless of bucket width.
 *
 * @param {{x:number,y:number}[]} points - Source points (must be sorted by x).
 * @param {number} maxPoints - Target output length (should be a multiple of 4).
 * @returns {{x:number,y:number}[]}
 */
export function m4(points, maxPoints) {
  assertSorted(points, "m4");
  if (maxPoints >= points.length || maxPoints < 4) return points.slice();

  const numBuckets = Math.max(1, Math.floor(maxPoints / 4));
  const buckets = splitBuckets(points, numBuckets);
  const sampled = [];

  for (const bucket of buckets) {
    if (bucket.length === 0) continue;

    let minYPt = bucket[0], maxYPt = bucket[0];
    for (const p of bucket) {
      if (p.y < minYPt.y) minYPt = p;
      if (p.y > maxYPt.y) maxYPt = p;
    }

    const first = bucket[0];
    const last = bucket[bucket.length - 1];

    // Deduplicate (same reference may appear in multiple roles) and sort by x
    const seen = new Set();
    const pts = [];
    for (const p of [first, last, minYPt, maxYPt]) {
      const key = `${p.x},${p.y}`;
      if (!seen.has(key)) { seen.add(key); pts.push(p); }
    }
    pts.sort((a, b) => a.x - b.x);
    for (const p of pts) sampled.push(p);
  }

  return sampled;
}

// ---------------------------------------------------------------------------
// RDP – Ramer–Douglas–Peucker
// (standalone – does not use shared helpers)
// ---------------------------------------------------------------------------

/**
 * Perpendicular distance from point `p` to the line through `lineA` and `lineB`.
 *
 * @param {{x:number,y:number}} p
 * @param {{x:number,y:number}} lineA
 * @param {{x:number,y:number}} lineB
 * @returns {number}
 */
function perpDist(p, lineA, lineB) {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - lineA.x, p.y - lineA.y);
  return Math.abs(dy * p.x - dx * p.y + lineB.x * lineA.y - lineB.y * lineA.x) / Math.sqrt(lenSq);
}

/**
 * Recursive RDP pass: marks indices of points that exceed `eps` for the
 * segment between `start` and `end`.
 *
 * @param {{x:number,y:number}[]} points
 * @param {number} eps
 * @param {number} start
 * @param {number} end
 * @param {Set<number>} keep
 */
function rdpRecurse(points, eps, start, end, keep) {
  if (end - start < 2) return;
  let maxD = 0, split = start + 1;
  for (let i = start + 1; i < end; i++) {
    const d = perpDist(points[i], points[start], points[end]);
    if (d > maxD) { maxD = d; split = i; }
  }
  if (maxD > eps) {
    keep.add(split);
    rdpRecurse(points, eps, start, split, keep);
    rdpRecurse(points, eps, split, end, keep);
  }
}

/**
 * Applies RDP simplification with a fixed `eps` and returns the surviving points.
 *
 * @param {{x:number,y:number}[]} points
 * @param {number} eps
 * @returns {{x:number,y:number}[]}
 */
function rdpWithEps(points, eps) {
  if (points.length <= 2) return points.slice();
  const keep = new Set([0, points.length - 1]);
  rdpRecurse(points, eps, 0, points.length - 1, keep);
  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}

/**
 * Ramer–Douglas–Peucker line-simplification downsampling.
 *
 * Finds an epsilon tolerance (via binary search) that reduces the series to at
 * most `maxPoints` points while preserving the overall shape. The first and last
 * points are always retained. When all interior points are collinear the result
 * falls back to uniform stride sampling.
 *
 * @param {{x:number,y:number}[]} points - Source points (must be sorted by x).
 * @param {number} maxPoints - Target output length.
 * @returns {{x:number,y:number}[]}
 */
export function rdp(points, maxPoints) {
  assertSorted(points, "rdp");
  if (maxPoints >= points.length || maxPoints < 2) return points.slice();

  // Upper bound for epsilon: max perpendicular distance from the baseline
  let hi = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > hi) hi = d;
  }

  if (hi === 0) {
    // All collinear – fall back to uniform stride
    const step = (points.length - 1) / (maxPoints - 1);
    return Array.from({ length: maxPoints }, (_, k) => points[Math.round(k * step)]);
  }

  let lo = 0, best = points.slice();
  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const candidate = rdpWithEps(points, mid);
    if (candidate.length > maxPoints) {
      lo = mid;
    } else {
      best = candidate;
      hi = mid;
    }
    if (best.length === maxPoints) break;
  }
  return best;
}

// ---------------------------------------------------------------------------
// LTD – Largest-Triangle-Dynamic
// Shared: triangleArea
// ---------------------------------------------------------------------------

/**
 * Largest-Triangle-Dynamic downsampling.
 *
 * A variant of LTTB where bucket sizes are recalculated at each selection step
 * based on the position of the previously chosen point. This adaptive sizing
 * concentrates resolution in dense or rapidly changing regions of the series.
 *
 * @param {{x:number,y:number}[]} points - Source points (must be sorted by x).
 * @param {number} maxPoints - Target output length.
 * @returns {{x:number,y:number}[]}
 */
export function ltd(points, maxPoints) {
  assertSorted(points, "ltd");
  if (maxPoints >= points.length || maxPoints < 3) return points.slice();

  const n = points.length;
  const sampled = [points[0]];
  let a = 0; // index of the last selected point

  for (let slot = 0; slot < maxPoints - 2; slot++) {
    const slotsLeft = maxPoints - 2 - slot; // includes this slot
    // Points remaining between the last selected (exclusive) and the forced final
    const available = n - 1 - a;
    const bucketSize = Math.max(1, Math.floor(available / (slotsLeft + 1)));

    const bucketStart = a + 1;
    const bucketEnd = Math.min(a + bucketSize, n - 2);

    // Centroid of the bucket immediately after the current one (third triangle vertex)
    const nextStart = bucketEnd + 1;
    const nextEnd = Math.min(bucketEnd + bucketSize, n - 1);
    let avgX = 0, avgY = 0, cnt = 0;
    for (let j = nextStart; j <= nextEnd; j++) {
      avgX += points[j].x; avgY += points[j].y; cnt++;
    }
    if (cnt === 0) { avgX = points[n - 1].x; avgY = points[n - 1].y; cnt = 1; }
    const avg = { x: avgX / cnt, y: avgY / cnt };

    let maxArea = -1, selected = bucketStart;
    for (let j = bucketStart; j <= bucketEnd; j++) {
      const area = triangleArea(points[a], points[j], avg);
      if (area > maxArea) { maxArea = area; selected = j; }
    }

    sampled.push(points[selected]);
    a = selected;
  }

  sampled.push(points[n - 1]);
  return sampled;
}

// ---------------------------------------------------------------------------
// LTOB – Largest-Triangle-One-Bucket
// Shared: triangleArea, splitBuckets
// ---------------------------------------------------------------------------

/**
 * Largest-Triangle-One-Bucket downsampling.
 *
 * Like LTTB, but uses the first point of the next bucket (rather than its
 * centroid) as the third triangle vertex. Slightly simpler and faster than
 * LTTB while still preserving visual peaks and troughs.
 *
 * @param {{x:number,y:number}[]} points - Source points (must be sorted by x).
 * @param {number} maxPoints - Target output length.
 * @returns {{x:number,y:number}[]}
 */
export function ltob(points, maxPoints) {
  assertSorted(points, "ltob");
  if (maxPoints >= points.length || maxPoints < 3) return points.slice();

  const n = points.length;
  const buckets = splitBuckets(points.slice(1, n - 1), maxPoints - 2);
  const sampled = [points[0]];
  let prev = points[0];

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    if (bucket.length === 0) continue;

    // Use the first point of the next bucket (or the final point) as the third vertex
    const nextPt = i < buckets.length - 1 && buckets[i + 1].length > 0
      ? buckets[i + 1][0]
      : points[n - 1];

    let maxArea = -1, selected = bucket[0];
    for (const p of bucket) {
      const area = triangleArea(prev, p, nextPt);
      if (area > maxArea) { maxArea = area; selected = p; }
    }
    sampled.push(selected);
    prev = selected;
  }

  sampled.push(points[n - 1]);
  return sampled;
}

// ---------------------------------------------------------------------------
// SMA – Simple Moving Average
// (standalone – does not use shared helpers)
// ---------------------------------------------------------------------------

/**
 * Simple Moving Average downsampling.
 *
 * Groups consecutive points into windows of size `ceil(n / maxPoints)` and
 * replaces each group with its mean (x̄, ȳ). Produces a smoothed series at the
 * requested resolution. Unlike the triangle-based samplers, SMA may shift peak
 * positions slightly but is useful for removing high-frequency noise.
 *
 * @param {{x:number,y:number}[]} points - Source points.
 * @param {number} maxPoints - Target output length.
 * @returns {{x:number,y:number}[]}
 */
export function sma(points, maxPoints) {
  if (maxPoints >= points.length) return points.slice();

  const window = Math.ceil(points.length / maxPoints);
  const result = [];

  for (let i = 0; i < points.length; i += window) {
    const end = Math.min(i + window, points.length);
    let sumX = 0, sumY = 0;
    for (let j = i; j < end; j++) { sumX += points[j].x; sumY += points[j].y; }
    const count = end - i;
    result.push({ x: sumX / count, y: sumY / count });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

const SAMPLERS = { lttb, m4, rdp, ltd, ltob, sma };
const SORTED_SAMPLERS = new Set(["lttb", "m4", "rdp", "ltd", "ltob"]);
const registrations = new WeakMap();

function registerSamplers(GraphClass, graph) {
  let owned = registrations.get(GraphClass);
  if (!owned) {
    owned = new Map();
    registrations.set(GraphClass, owned);
  }

  for (const [name, fn] of Object.entries(SAMPLERS)) {
    let record = owned.get(name);
    if (!record) {
      record = {
        fn,
        previous: GraphClass.samplers?.get(name),
        owners: new Set()
      };
      owned.set(name, record);
      GraphClass.registerSampler(name, fn);
    }
    record.owners.add(graph);
    if (SORTED_SAMPLERS.has(name)) {
      fn.requiresSorted = true;
    }
  }
}

function unregisterSamplers(GraphClass, graph) {
  const owned = registrations.get(GraphClass);
  if (!owned) return;

  for (const [name, record] of owned) {
    record.owners.delete(graph);
    if (record.owners.size > 0) continue;

    if (GraphClass.samplers.get(name) === record.fn) {
      if (record.previous) GraphClass.registerSampler(name, record.previous);
      else GraphClass.unregisterSampler(name);
    }
    owned.delete(name);
  }
  if (owned.size === 0) registrations.delete(GraphClass);
}

/**
 * First-party sampling extension for GraphJS.
 *
 * Registers the following samplers with the global `Graph.samplers` map on
 * install: `lttb`, `m4`, `rdp`, `ltd`, `ltob`, `sma`.
 *
 * Reference them by name in series sampling options:
 * ```js
 * graph.setOptions({ sampling: { enabled: true, maxPoints: 500, method: "lttb" } });
 * ```
 *
 * Common helper functions (`triangleArea`, `splitBuckets`) used internally by
 * multiple samplers are also exported via the `./common` subpackage for
 * consumers who need them for custom samplers.
 */
export const samplingPlugin = {
  id: "sampling",
  install(graph) {
    const GraphClass = graph.constructor;
    registerSamplers(GraphClass, graph);
  },
  hooks: {
    beforeDestroy(graph) {
      unregisterSamplers(graph.constructor, graph);
    }
  }
};
