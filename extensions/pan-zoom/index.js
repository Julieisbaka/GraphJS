import { clampBounds } from "../../src/core/utils.js";

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
 * First-party pan/zoom extension for GraphJS.
 *
 * Adds wheel zooming, drag panning, viewport state, and runtime commands
 * (`pan-zoom.set`, `pan-zoom.resetView`).
 */
export const panZoomPlugin = {
  id: "pan-zoom",
  defaults: {
    enabled: true,
    zoomStep: 0.12,
    minZoomStep: 0.01,
    maxZoomStep: 0.8,
    minSpanX: 0.0001,
    minSpanY: 0.0001
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
            if (Number.isFinite(payload.zoomStep)) {
              options.zoomStep = clamp(payload.zoomStep, options.minZoomStep, options.maxZoomStep);
            }
            api.requestRender();
            return { enabled: options.enabled, zoomStep: options.zoomStep };
          },
          {
            description: "Set pan-zoom enabled and zoomStep",
            argsExample: { enabled: true, zoomStep: 0.15 }
          }
        );

    state.pointerDown = false;
    state.layout = null;
    state.bounds = null;

    const onWheel = (event) => {
      if (!options.enabled || !state.layout || !state.view || !state.bounds) {
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
      if (!options.enabled || event.button !== 0 || !state.layout) {
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
      if (!options.enabled || !state.pointerDown || !state.layout || !state.view || !state.lastMouse) {
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
    window.addEventListener("mouseup", onUp);

    api.setState({ ...state, onWheel, onDown, onMove, onUp });
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
      if (state.onUp) {
        window.removeEventListener("mouseup", state.onUp);
      }
    }
  }
};
