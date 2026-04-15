/**
 * Returns true when a value is a plain object literal.
 *
 * @param {unknown} value - Value to check.
 * @returns {boolean} True if the value is a plain object.
 */
export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * Deeply merges object properties from source into target.
 * Arrays are copied by value and replace target arrays.
 *
 * @param {Record<string, any>} [target={}] - Base object.
 * @param {Record<string, any>} [source={}] - Object with overriding properties.
 * @returns {Record<string, any>} A new merged object.
 */
export function deepMerge(target = {}, source = {}) {
  const out = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      out[key] = value.slice();
      continue;
    }

    if (isPlainObject(value)) {
      out[key] = deepMerge(isPlainObject(out[key]) ? out[key] : {}, value);
      continue;
    }

    out[key] = value;
  }

  return out;
}

/**
 * Clamps a numeric value between min and max.
 *
 * @param {number} value - Input value.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Clamped value.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Resolves a canvas target from either a selector or direct element.
 *
 * @param {string|HTMLCanvasElement} target - CSS selector or canvas element.
 * @returns {HTMLCanvasElement} Resolved canvas element.
 * @throws {Error} If target is empty or selector is not found.
 */
export function resolveCanvas(target) {
  if (!target) {
    throw new Error("A canvas target is required.");
  }

  if (typeof target === "string") {
    const node = document.querySelector(target);
    if (!node) {
      throw new Error(`Could not find canvas with selector: ${target}`);
    }
    return node;
  }

  return target;
}

/**
 * Returns the current device pixel ratio.
 *
 * @returns {number} Pixel ratio, defaults to 1 in non-browser environments.
 */
export function getDevicePixelRatio() {
  return typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
}

/**
 * Normalizes raw series data into GraphJS internal format.
 *
 * @param {Array<any>} rawData - Series array supplied by user.
 * @returns {Array<object>} Normalized series list.
 * @throws {Error} If rawData is not an array.
 */
export function normalizeSeriesData(rawData, seriesDefaults = {}) {
  if (!Array.isArray(rawData)) {
    throw new Error("Data must be an array of series.");
  }

  return rawData.map((series, index) => {
    const safeSeries = series || {};
    const points = Array.isArray(safeSeries.points) ? safeSeries.points : [];

    return {
      id: safeSeries.id || `series_${index}`,
      type: safeSeries.type || seriesDefaults.type || "line",
      color: safeSeries.color || seriesDefaults.color || "#3b82f6",
      lineWidth: safeSeries.lineWidth ?? seriesDefaults.lineWidth ?? 2,
      pointRadius: safeSeries.pointRadius ?? seriesDefaults.pointRadius ?? 0,
      visible: safeSeries.visible !== false,
      points: points.map((p) => ({ x: Number(p.x), y: Number(p.y) }))
    };
  });
}

/**
 * Computes finite x/y bounds across all series points.
 * Falls back to a default 0..1 domain when no valid points exist.
 *
 * @param {Array<{points:Array<{x:number,y:number}>}>} seriesList - Series list.
 * @returns {{xMin:number,xMax:number,yMin:number,yMax:number}} Data bounds.
 */
export function getDataBounds(seriesList) {
  const bounds = {
    xMin: Number.POSITIVE_INFINITY,
    xMax: Number.NEGATIVE_INFINITY,
    yMin: Number.POSITIVE_INFINITY,
    yMax: Number.NEGATIVE_INFINITY
  };

  for (const s of seriesList) {
    for (const p of s.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        continue;
      }
      bounds.xMin = Math.min(bounds.xMin, p.x);
      bounds.xMax = Math.max(bounds.xMax, p.x);
      bounds.yMin = Math.min(bounds.yMin, p.y);
      bounds.yMax = Math.max(bounds.yMax, p.y);
    }
  }

  if (!Number.isFinite(bounds.xMin)) {
    return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }

  if (bounds.xMin === bounds.xMax) {
    bounds.xMax += 1;
  }
  if (bounds.yMin === bounds.yMax) {
    bounds.yMax += 1;
  }

  return bounds;
}

/**
 * Deeply freezes an object graph and returns the same reference.
 *
 * @template T
 * @param {T} value - Value to freeze.
 * @returns {Readonly<T>} Deeply frozen value.
 */
export function deepFreeze(value) {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return value;
  }

  const propNames = Object.getOwnPropertyNames(value);
  for (const name of propNames) {
    const prop = value[name];
    if (prop && typeof prop === "object" && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }

  return Object.freeze(value);
}

/**
 * Reduces a point list to at most maxPoints using fixed stride sampling.
 *
 * @template T
 * @param {T[]} points - Input point list.
 * @param {number} maxPoints - Maximum number of points to keep.
 * @returns {T[]} Decimated point list.
 */
export function decimatePointsStride(points, maxPoints) {
  if (!Array.isArray(points) || points.length <= maxPoints) {
    return points;
  }

  const stride = Math.ceil(points.length / Math.max(1, maxPoints));
  const last = points[points.length - 1];
  const out = [];
  for (let i = 0; i < points.length; i += stride) {
    out.push(points[i]);
  }

  // Ensure the last data point is always represented. Replace the final
  // strided element rather than appending, so output length never exceeds maxPoints.
  if (out[out.length - 1] !== last) {
    out[out.length - 1] = last;
  }

  return out;
}

/**
 * Returns a linear scale function mapping a domain range to a pixel range.
 *
 * @param {number} domainMin - Input domain minimum.
 * @param {number} domainMax - Input domain maximum.
 * @param {number} rangeMin - Output range minimum (pixels).
 * @param {number} rangeMax - Output range maximum (pixels).
 * @returns {(value: number) => number} Scale function.
 */
export function makeLinearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const domainSpan = domainMax - domainMin;
  const rangeSpan = rangeMax - rangeMin;
  return (value) => rangeMin + ((value - domainMin) / domainSpan) * rangeSpan;
}

/**
 * Inverts a linear scale: converts a pixel coordinate back to a domain value.
 *
 * @param {number} px - Pixel coordinate to invert.
 * @param {number} domainMin - Input domain minimum.
 * @param {number} domainMax - Input domain maximum.
 * @param {number} rangeMin - Output range minimum (pixels).
 * @param {number} rangeMax - Output range maximum (pixels).
 * @returns {number} Domain value.
 */
export function invertLinearScale(px, domainMin, domainMax, rangeMin, rangeMax) {
  const domainSpan = domainMax - domainMin;
  const rangeSpan = rangeMax - rangeMin;
  return domainMin + ((px - rangeMin) / rangeSpan) * domainSpan;
}

/**
 * Clamps a viewport DataBounds to stay within a full DataBounds,
 * preserving the viewport's span.
 *
 * @param {{xMin:number,xMax:number,yMin:number,yMax:number}} view - Viewport bounds.
 * @param {{xMin:number,xMax:number,yMin:number,yMax:number}} full - Full data bounds.
 * @returns {{xMin:number,xMax:number,yMin:number,yMax:number}} Clamped viewport.
 */
export function clampBounds(view, full) {
  const spanX = view.xMax - view.xMin;
  const spanY = view.yMax - view.yMin;
  const maxOffsetX = Math.max(0, full.xMax - full.xMin - spanX);
  const maxOffsetY = Math.max(0, full.yMax - full.yMin - spanY);
  const offsetX = Math.max(0, Math.min(view.xMin - full.xMin, maxOffsetX));
  const offsetY = Math.max(0, Math.min(view.yMin - full.yMin, maxOffsetY));
  return {
    xMin: full.xMin + offsetX,
    xMax: full.xMin + offsetX + spanX,
    yMin: full.yMin + offsetY,
    yMax: full.yMin + offsetY + spanY
  };
}

/**
 * Applies a partial domain override on top of data bounds.
 * Only finite values in the domain object are applied.
 *
 * @param {{xMin:number,xMax:number,yMin:number,yMax:number}} dataBounds - Computed data bounds.
 * @param {{xMin?:number,xMax?:number,yMin?:number,yMax?:number}|null} domain - Domain override or null.
 * @returns {{xMin:number,xMax:number,yMin:number,yMax:number}} Resolved bounds.
 */
export function applyDomainOverride(dataBounds, domain) {
  if (!domain) {
    return { ...dataBounds };
  }
  const resolved = { ...dataBounds };
  if (Number.isFinite(domain.xMin)) resolved.xMin = domain.xMin;
  if (Number.isFinite(domain.xMax)) resolved.xMax = domain.xMax;
  if (Number.isFinite(domain.yMin)) resolved.yMin = domain.yMin;
  if (Number.isFinite(domain.yMax)) resolved.yMax = domain.yMax;
  return resolved;
}

/**
 * Filters a series list to only visible series.
 *
 * @param {Array<{visible:boolean}>} seriesList - Full series list.
 * @returns {Array<{visible:boolean}>} Visible series only.
 */
export function filterVisibleSeries(seriesList) {
  return seriesList.filter((s) => s.visible);
}