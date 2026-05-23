/**
 * Shared utilities for sampling algorithms.
 *
 * These helpers are used internally by multiple samplers (LTTB, LTD, LTOB,
 * and M4) to avoid code duplication. They are also accessible by consumers
 * who want to compose custom samplers via the `./common` subpackage export.
 */

/**
 * Computes the area of the triangle formed by three (x, y) points.
 *
 * Used by LTTB, LTD, and LTOB to find the most visually significant
 * point within each sampling bucket.
 *
 * @param {{x:number,y:number}} a - First vertex.
 * @param {{x:number,y:number}} b - Second vertex.
 * @param {{x:number,y:number}} c - Third vertex.
 * @returns {number} Triangle area (always non-negative).
 */
export function triangleArea(a, b, c) {
  return Math.abs(
    (a.x - c.x) * (b.y - a.y) -
    (a.x - b.x) * (c.y - a.y)
  ) * 0.5;
}

/**
 * Splits an array of points into `n` non-overlapping contiguous buckets of
 * roughly equal size. Remainder points are distributed across the first buckets.
 *
 * Used by LTTB, LTOB, and M4.
 *
 * @param {{x:number,y:number}[]} points - Source array to split.
 * @param {number} n - Number of buckets.
 * @returns {{x:number,y:number}[][]} Array of `n` buckets (some may be empty when n > points.length).
 */
export function splitBuckets(points, n) {
  const buckets = [];
  const size = points.length / n;
  for (let i = 0; i < n; i++) {
    buckets.push(points.slice(Math.floor(i * size), Math.floor((i + 1) * size)));
  }
  return buckets;
}
