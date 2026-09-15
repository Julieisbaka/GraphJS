const M = Math;

/**
 * Clamps a numeric value between min and max.
 *
 * @param {number} value - Input value.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} Clamped value.
 */
function clamp(value, min, max) {
  return M.max(min, M.min(max, value));
}

/**
 * Clamps a viewport bounds object to stay within the full bounds while preserving span.
 *
 * @param {{xMin:number,xMax:number,yMin:number,yMax:number}} view - Viewport bounds.
 * @param {{xMin:number,xMax:number,yMin:number,yMax:number}} full - Full data bounds.
 * @returns {{xMin:number,xMax:number,yMin:number,yMax:number}} Clamped viewport.
 */
function clampBounds(view, full) {
  const spanX = view.xMax - view.xMin;
  const spanY = view.yMax - view.yMin;
  const maxOffsetX = M.max(0, full.xMax - full.xMin - spanX);
  const maxOffsetY = M.max(0, full.yMax - full.yMin - spanY);
  const offsetX = M.max(0, M.min(view.xMin - full.xMin, maxOffsetX));
  const offsetY = M.max(0, M.min(view.yMin - full.yMin, maxOffsetY));

  return {
    xMin: full.xMin + offsetX,
    xMax: full.xMin + offsetX + spanX,
    yMin: full.yMin + offsetY,
    yMax: full.yMin + offsetY + spanY
  };
}

/**
 * Computes local canvas coordinates for a pointer event.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas.
 * @param {MouseEvent|WheelEvent} event - Pointer event.
 * @returns {{x:number,y:number}} Local coordinates.
 */
function getMousePosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/**
 * Ensures the view window is initialized from full bounds.
 *
 * @param {Record<string, any>} state - Plugin state object.
 * @param {{xMin:number,xMax:number,yMin:number,yMax:number}} bounds - Full data bounds.
 */
function ensureView(state, bounds) {
  if (!state.view) {
    state.view = { ...bounds };
  }
}

/**
 * Finds the nearest rendered data point to the mouse location.
 *
 * @param {import("@julieisbaka/graphjs").Graph} graph - Graph instance.
 * @param {{left:number,top:number,right:number,bottom:number,width:number,height:number}} layout - Plot layout.
 * @param {{xMin:number,xMax:number,yMin:number,yMax:number}} bounds - Current data bounds.
 * @param {{x:number,y:number}} mouse - Mouse position in canvas space.
 * @param {number} radius - Hit radius in pixels.
 * @returns {{series:object,point:object,px:number,py:number}|null} Nearest point payload.
 */
function findNearestPoint(graph, layout, bounds, mouse, radius) {
  const xRange = bounds.xMax - bounds.xMin;
  const yRange = bounds.yMax - bounds.yMin;
  if (xRange <= 0 || yRange <= 0) {
    return null;
  }

  let best = null;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const series of graph.data || []) {
    if (!series.visible) {
      continue;
    }

    for (const point of series.points || []) {
      const px = layout.left + ((point.x - bounds.xMin) / xRange) * layout.width;
      const py = layout.bottom - ((point.y - bounds.yMin) / yRange) * layout.height;
      const dx = px - mouse.x;
      const dy = py - mouse.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = { series, point, px, py };
      }
    }
  }

  return best && bestDistSq <= radius * radius ? best : null;
}

/**
 * First-party pan/zoom extension for GraphJS.
 *
 * Adds wheel zooming, drag panning, hover guides, nearest-point highlighting,
 * tooltip rendering, viewport state, and runtime commands (`pan-zoom.set`,
 * `pan-zoom.resetView`).
 */
export const panZoomPlugin = {
  id: "pan-zoom",
  defaults: {
    enabled: true,
    panEnabled: true,
    tooltipEnabled: true,
    zoomStep: 0.12,
    minZoomStep: 0.01,
    maxZoomStep: 0.8,
    minSpanX: 0.0001,
    minSpanY: 0.0001,
    guideColor: "rgba(15, 23, 42, 0.35)",
    guideWidth: 1,
    guideDash: [4, 4],
    pointRadius: 4,
    hitRadius: 24,
    tooltipBg: "rgba(15, 23, 42, 0.92)",
    tooltipColor: "#f8fafc",
    tooltipFont: "12px Segoe UI, sans-serif",
    formatter: ({ series, point }) => `${series.id}: (${point.x}, ${point.y})`
  },
  install(graph, options, api) {
    const state = api.getPluginState() || {};
        api.registerCommand(
          "resetView",
          () => {
            state.view = null;
            api.setState(state);
            api.requestRender();
            return { reset: true };
          },
          {
            description: "Reset pan-zoom viewport to full bounds"
          }
        );

        api.registerCommand(
          "set",
          (payload = {}) => {
            if (typeof payload.enabled === "boolean") {
              options.enabled = payload.enabled;
            }
            if (typeof payload.panEnabled === "boolean") {
              options.panEnabled = payload.panEnabled;
            }
            if (typeof payload.tooltipEnabled === "boolean") {
              options.tooltipEnabled = payload.tooltipEnabled;
            }
            if (Number.isFinite(payload.zoomStep)) {
              options.zoomStep = clamp(payload.zoomStep, options.minZoomStep, options.maxZoomStep);
            }
            if (Number.isFinite(payload.hitRadius)) {
              options.hitRadius = Math.max(1, payload.hitRadius);
            }
            api.requestRender();
            const result = {
              enabled: options.enabled,
              zoomStep: options.zoomStep,
            };
            if (
              typeof payload.panEnabled === "boolean" ||
              typeof payload.tooltipEnabled === "boolean" ||
              Number.isFinite(payload.hitRadius)
            ) {
              result.panEnabled = options.panEnabled;
              result.tooltipEnabled = options.tooltipEnabled;
              result.hitRadius = options.hitRadius;
            }
            return result;
          },
          {
            description: "Set pan-zoom and tooltip-cursor options",
            argsExample: { enabled: true, panEnabled: true, tooltipEnabled: true, zoomStep: 0.15 }
          }
        );

    state.pointerDown = false;
    state.layout = null;
    state.bounds = null;

    const onTooltipLeave = () => {
      api.setState({ mouse: null, active: false, nearest: null });
      api.requestRender();
    };

    const onWheel = (event) => {
      if (!options.enabled || options.panEnabled === false || !state.layout || !state.view || !state.bounds) {
        return;
      }

      event.preventDefault();
      const mouse = getMousePosition(graph.canvas, event);
      const { layout, view } = state;
      if (
        mouse.x < layout.left ||
        mouse.x > layout.right ||
        mouse.y < layout.top ||
        mouse.y > layout.bottom
      ) {
        return;
      }

      const zoomDir = event.deltaY < 0 ? 1 : -1;
      const factor = 1 - zoomDir * options.zoomStep;
      const mx = (mouse.x - layout.left) / layout.width;
      const my = (layout.bottom - mouse.y) / layout.height;

      const spanX = view.xMax - view.xMin;
      const spanY = view.yMax - view.yMin;
      const nextSpanX = Math.max(options.minSpanX, spanX * factor);
      const nextSpanY = Math.max(options.minSpanY, spanY * factor);

      const anchorX = view.xMin + spanX * mx;
      const anchorY = view.yMin + spanY * my;

      const next = {
        xMin: anchorX - nextSpanX * mx,
        xMax: anchorX + nextSpanX * (1 - mx),
        yMin: anchorY - nextSpanY * my,
        yMax: anchorY + nextSpanY * (1 - my)
      };

      state.view = clampBounds(next, state.bounds);
      api.setState(state);
      api.requestRender();
    };

    const onDown = (event) => {
      if (!options.enabled || options.panEnabled === false || event.button !== 0 || !state.layout) {
        return;
      }

      const mouse = getMousePosition(graph.canvas, event);
      if (
        mouse.x < state.layout.left ||
        mouse.x > state.layout.right ||
        mouse.y < state.layout.top ||
        mouse.y > state.layout.bottom
      ) {
        return;
      }

      state.pointerDown = true;
      state.lastMouse = mouse;
      api.setState(state);
    };

    const onUp = () => {
      state.pointerDown = false;
      state.lastMouse = null;
      api.setState(state);
    };

    const onMove = (event) => {
      if (options.enabled && options.tooltipEnabled !== false) {
        api.setState({ mouse: getMousePosition(graph.canvas, event), active: true });
        if (graph.data) {
          api.requestRender();
        }
      }

      if (!options.enabled || options.panEnabled === false || !state.pointerDown || !state.layout || !state.view || !state.lastMouse) {
        return;
      }

      const mouse = getMousePosition(graph.canvas, event);
      const dx = mouse.x - state.lastMouse.x;
      const dy = mouse.y - state.lastMouse.y;

      const spanX = state.view.xMax - state.view.xMin;
      const spanY = state.view.yMax - state.view.yMin;
      const dDomainX = -(dx / state.layout.width) * spanX;
      const dDomainY = (dy / state.layout.height) * spanY;

      const nextView = {
        xMin: state.view.xMin + dDomainX,
        xMax: state.view.xMax + dDomainX,
        yMin: state.view.yMin + dDomainY,
        yMax: state.view.yMax + dDomainY
      };

      state.view = clampBounds(nextView, state.bounds);
      state.lastMouse = mouse;
      api.setState(state);
      api.requestRender();
    };

    graph.canvas.addEventListener("wheel", onWheel, { passive: false });
    graph.canvas.addEventListener("mousedown", onDown);
    graph.canvas.addEventListener("mousemove", onMove);
    graph.canvas.addEventListener("mouseleave", onTooltipLeave);
    window.addEventListener("mouseup", onUp);

    api.setState({ ...state, onWheel, onDown, onMove, onUp, onTooltipLeave, mouse: null, active: false, nearest: null });
  },
  hooks: {
    afterLayout(graph, context, options, api) {
      const state = api.getPluginState() || {};
      state.layout = context.layout;
      state.bounds = context.bounds;
      ensureView(state, context.bounds);
      api.setState(state);
    },
    beforeRender(graph, context, options, api) {
      if (!options.enabled) {
        return;
      }

      const state = api.getPluginState() || {};
      ensureView(state, context.bounds);
      context.bounds.xMin = state.view.xMin;
      context.bounds.xMax = state.view.xMax;
      context.bounds.yMin = state.view.yMin;
      context.bounds.yMax = state.view.yMax;
    },
    afterRender(graph, context, options, api) {
      const state = api.getPluginState() || {};
      if (!options.enabled || options.tooltipEnabled === false || !state.active || !state.mouse) {
        return;
      }

      const { layout, bounds } = context;
      const nearest = findNearestPoint(graph, layout, bounds, state.mouse, options.hitRadius);
      api.setState({ nearest });
      if (!nearest) {
        return;
      }

      const ctx = graph.ctx;
      const { px, py, series, point } = nearest;
      ctx.save();
      ctx.strokeStyle = options.guideColor;
      ctx.lineWidth = options.guideWidth;
      ctx.setLineDash(Array.isArray(options.guideDash) ? options.guideDash : []);

      ctx.beginPath();
      ctx.moveTo(px, layout.top);
      ctx.lineTo(px, layout.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(layout.left, py);
      ctx.lineTo(layout.right, py);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = series.color || "#3b82f6";
      ctx.beginPath();
      ctx.arc(px, py, options.pointRadius, 0, Math.PI * 2);
      ctx.fill();

      let text = "tooltip";
      try {
        text = options.formatter({ series, point });
      } catch {
        text = `${series.id}: (${point.x}, ${point.y})`;
      }
      ctx.font = options.tooltipFont;
      const textWidth = ctx.measureText(text).width;
      const padX = 8;
      const boxHeight = 24;
      const boxWidth = textWidth + padX * 2;
      let boxX = px + 10;
      let boxY = py - boxHeight - 10;
      if (boxX + boxWidth > layout.right) boxX = px - boxWidth - 10;
      if (boxY < layout.top) boxY = py + 10;

      ctx.fillStyle = options.tooltipBg;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.fillStyle = options.tooltipColor;
      ctx.textBaseline = "middle";
      ctx.fillText(text, boxX + padX, boxY + boxHeight / 2);
      ctx.restore();
    },
    beforeSetData(graph, context, options, api) {
      const state = api.getPluginState() || {};
      state.view = null;
      api.setState(state);
    },
    beforeDestroy(graph, context, options, api) {
      const state = api.getPluginState() || {};
      if (state.onWheel) {
        graph.canvas.removeEventListener("wheel", state.onWheel);
      }
      if (state.onDown) {
        graph.canvas.removeEventListener("mousedown", state.onDown);
      }
      if (state.onMove) {
        graph.canvas.removeEventListener("mousemove", state.onMove);
      }
      if (state.onTooltipLeave) {
        graph.canvas.removeEventListener("mouseleave", state.onTooltipLeave);
      }
      if (state.onUp) {
        window.removeEventListener("mouseup", state.onUp);
      }
    }
  }
};
