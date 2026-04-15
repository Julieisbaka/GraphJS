function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateDomain(domain) {
  if (domain == null) {
    return;
  }

  assert(typeof domain === "object", "options.domain must be an object or null.");
  const keys = ["xMin", "xMax", "yMin", "yMax"];
  for (const key of keys) {
    if (domain[key] != null) {
      assert(isFiniteNumber(domain[key]), `options.domain.${key} must be a finite number.`);
    }
  }

  if (isFiniteNumber(domain.xMin) && isFiniteNumber(domain.xMax)) {
    assert(domain.xMin < domain.xMax, "options.domain requires xMin < xMax.");
  }

  if (isFiniteNumber(domain.yMin) && isFiniteNumber(domain.yMax)) {
    assert(domain.yMin < domain.yMax, "options.domain requires yMin < yMax.");
  }
}

export function validateGraphOptions(options) {
  assert(isFiniteNumber(options.width) && options.width > 0, "options.width must be a positive number.");
  assert(isFiniteNumber(options.height) && options.height > 0, "options.height must be a positive number.");

  assert(typeof options.padding === "object", "options.padding must be an object.");
  for (const key of ["top", "right", "bottom", "left"]) {
    assert(isFiniteNumber(options.padding[key]) && options.padding[key] >= 0, `options.padding.${key} must be a non-negative number.`);
  }

  assert(Array.isArray(options.plugins), "options.plugins must be an array.");

  assert(typeof options.immutableInputs === "boolean", "options.immutableInputs must be a boolean.");
  validateDomain(options.domain);

  assert(typeof options.sampling === "object", "options.sampling must be an object.");
  assert(typeof options.sampling.enabled === "boolean", "options.sampling.enabled must be a boolean.");
  assert(Number.isInteger(options.sampling.maxPoints) && options.sampling.maxPoints >= 2, "options.sampling.maxPoints must be an integer >= 2.");
  assert(typeof options.sampling.method === "string" && options.sampling.method.trim().length > 0, "options.sampling.method must be a non-empty string.");
  assert(options.sampling.method === options.sampling.method.trim(), "options.sampling.method must not contain leading or trailing whitespace.");

  if (options.series != null) {
    assert(typeof options.series === "object" && !Array.isArray(options.series), "options.series must be a plain object.");
    if (options.series.type != null) {
      assert(typeof options.series.type === "string" && options.series.type.trim().length > 0, "options.series.type must be a non-empty string.");
    }
    if (options.series.color != null) {
      assert(typeof options.series.color === "string" && options.series.color.length > 0, "options.series.color must be a non-empty string.");
    }
    if (options.series.lineWidth != null) {
      assert(isFiniteNumber(options.series.lineWidth) && options.series.lineWidth > 0, "options.series.lineWidth must be a positive number.");
    }
    if (options.series.pointRadius != null) {
      assert(isFiniteNumber(options.series.pointRadius) && options.series.pointRadius >= 0, "options.series.pointRadius must be a non-negative number.");
    }
  }

  assert(typeof options.scalability === "object", "options.scalability must be an object.");
  for (const key of ["dirtyRender", "layerCaching", "useOffscreenCanvas"]) {
    assert(typeof options.scalability[key] === "boolean", `options.scalability.${key} must be a boolean.`);
  }

  assert(typeof options.pluginErrorBoundary === "object", "options.pluginErrorBoundary must be an object.");
  assert(typeof options.pluginErrorBoundary.enabled === "boolean", "options.pluginErrorBoundary.enabled must be a boolean.");
  if (options.pluginErrorBoundary.onError != null) {
    assert(typeof options.pluginErrorBoundary.onError === "function", "options.pluginErrorBoundary.onError must be a function when provided.");
  }
}

export function validatePluginContract(plugin) {
  assert(plugin && typeof plugin === "object", "Plugin must be an object.");
  assert(typeof plugin.id === "string" && plugin.id.trim().length > 0, "Plugin id must be a non-empty string.");

  if (plugin.before != null) {
    assert(Array.isArray(plugin.before), `Plugin '${plugin.id}' before must be an array.`);
  }
  if (plugin.after != null) {
    assert(Array.isArray(plugin.after), `Plugin '${plugin.id}' after must be an array.`);
  }

  if (plugin.capabilities != null) {
    assert(typeof plugin.capabilities === "object", `Plugin '${plugin.id}' capabilities must be an object.`);
    if (plugin.capabilities.hooks != null) {
      assert(Array.isArray(plugin.capabilities.hooks), `Plugin '${plugin.id}' capabilities.hooks must be an array.`);
    }
  }
}
