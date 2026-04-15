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

  assert(typeof domain === "object", "domain: expected object or null.");
  const keys = ["xMin", "xMax", "yMin", "yMax"];
  for (const key of keys) {
    if (domain[key] != null) {
      assert(isFiniteNumber(domain[key]), `domain.${key}: must be a finite number.`);
    }
  }

  if (isFiniteNumber(domain.xMin) && isFiniteNumber(domain.xMax)) {
    assert(domain.xMin < domain.xMax, "domain: xMin < xMax.");
  }

  if (isFiniteNumber(domain.yMin) && isFiniteNumber(domain.yMax)) {
    assert(domain.yMin < domain.yMax, "domain: yMin < yMax.");
  }
}

export function validateGraphOptions(options) {
  assert(isFiniteNumber(options.width) && options.width > 0, "width: expected positive number.");
  assert(isFiniteNumber(options.height) && options.height > 0, "height: expected positive number.");

  assert(typeof options.padding === "object", "padding: expected object.");
  for (const key of ["top", "right", "bottom", "left"]) {
    assert(isFiniteNumber(options.padding[key]) && options.padding[key] >= 0, `padding.${key}: expected non-negative number.`);
  }

  assert(Array.isArray(options.plugins), "plugins: expected array.");

  assert(typeof options.immutableInputs === "boolean", "immutableInputs: expected boolean.");
  validateDomain(options.domain);

  assert(typeof options.sampling === "object", "sampling: expected object.");
  assert(typeof options.sampling.enabled === "boolean", "sampling.enabled: expected boolean.");
  assert(Number.isInteger(options.sampling.maxPoints) && options.sampling.maxPoints >= 2, "sampling.maxPoints: expected integer >= 2.");
  assert(typeof options.sampling.method === "string" && options.sampling.method.trim().length > 0, "sampling.method: expected non-empty string.");
  assert(options.sampling.method === options.sampling.method.trim(), "sampling.method: no surrounding whitespace.");

  if (options.series != null) {
    assert(typeof options.series === "object" && !Array.isArray(options.series), "series: expected plain object.");
    if (options.series.type != null) {
      assert(typeof options.series.type === "string" && options.series.type.trim().length > 0, "series.type: expected non-empty string.");
    }
    if (options.series.color != null) {
      assert(typeof options.series.color === "string" && options.series.color.length > 0, "series.color: expected non-empty string.");
    }
    if (options.series.lineWidth != null) {
      assert(isFiniteNumber(options.series.lineWidth) && options.series.lineWidth > 0, "series.lineWidth: expected positive number.");
    }
    if (options.series.pointRadius != null) {
      assert(isFiniteNumber(options.series.pointRadius) && options.series.pointRadius >= 0, "series.pointRadius: expected non-negative number.");
    }
  }

  assert(typeof options.scalability === "object", "scalability: expected object.");
  for (const key of ["dirtyRender", "layerCaching", "useOffscreenCanvas"]) {
    assert(typeof options.scalability[key] === "boolean", `scalability.${key}: expected boolean.`);
  }

  assert(typeof options.pluginErrorBoundary === "object", "pluginErrorBoundary: expected object.");
  assert(typeof options.pluginErrorBoundary.enabled === "boolean", "pluginErrorBoundary.enabled: expected boolean.");
  if (options.pluginErrorBoundary.onError != null) {
    assert(typeof options.pluginErrorBoundary.onError === "function", "pluginErrorBoundary.onError: expected function.");
  }
}

export function validatePluginContract(plugin) {
  assert(plugin && typeof plugin === "object", "Plugin must be an object.");
  assert(typeof plugin.id === "string" && plugin.id.trim().length > 0, "plugin.id: expected non-empty string.");

  if (plugin.before != null) {
    assert(Array.isArray(plugin.before), `plugin '${plugin.id}': before expected array.`);
  }
  if (plugin.after != null) {
    assert(Array.isArray(plugin.after), `plugin '${plugin.id}': after expected array.`);
  }

  if (plugin.capabilities != null) {
    assert(typeof plugin.capabilities === "object", `plugin '${plugin.id}': capabilities expected object.`);
    if (plugin.capabilities.hooks != null) {
      assert(Array.isArray(plugin.capabilities.hooks), `plugin '${plugin.id}': capabilities.hooks expected array.`);
    }
  }
}
