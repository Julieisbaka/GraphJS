/**
 * Computes local canvas coordinates for a pointer event.
 *
 * @param {HTMLCanvasElement} canvas - Target canvas.
 * @param {MouseEvent} event - Pointer event.
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
 * Finds the nearest rendered data point to the mouse location.
 *
 * @param {import("../../graphjs/src/core/Graph.js").Graph} graph - Graph instance.
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

  for (const series of graph.data) {
    if (!series.visible) {
      continue;
    }

    for (const point of series.points) {
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

  if (!best || bestDistSq > radius * radius) {
    return null;
  }

  return best;
}

/**
 * First-party tooltip + cursor extension for GraphJS.
 *
 * Adds hover guides, nearest-point highlighting, tooltip rendering, and
 * a command (`tooltip-cursor.set`) for runtime configuration updates.
 */
export const tooltipCursorPlugin = {
  id: "tooltip-cursor",
  defaults: {
    enabled: true,
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
    api.registerCommand(
      "set",
      (payload = {}) => {
        if (typeof payload.enabled === "boolean") {
          options.enabled = payload.enabled;
        }
        if (Number.isFinite(payload.hitRadius)) {
          options.hitRadius = Math.max(1, payload.hitRadius);
        }
        api.requestRender();
        return { enabled: options.enabled, hitRadius: options.hitRadius };
      },
      {
        description: "Set tooltip/cursor enabled and hit radius",
        argsExample: { enabled: true, hitRadius: 18 }
      }
    );

    const onMove = (event) => {
      api.setState({ mouse: getMousePosition(graph.canvas, event), active: true });
      api.requestRender();
    };

    const onLeave = () => {
      api.setState({ mouse: null, active: false, nearest: null });
      api.requestRender();
    };

    graph.canvas.addEventListener("mousemove", onMove);
    graph.canvas.addEventListener("mouseleave", onLeave);
    api.setState({ onMove, onLeave, mouse: null, active: false, nearest: null });
  },
  hooks: {
    afterRender(graph, context, options, api) {
      const state = api.getPluginState() || {};
      if (!options.enabled || !state.active || !state.mouse) {
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
      const padY = 5;
      const boxWidth = textWidth + padX * 2;
      const boxHeight = 24;

      let boxX = px + 10;
      let boxY = py - boxHeight - 10;

      if (boxX + boxWidth > layout.right) {
        boxX = px - boxWidth - 10;
      }
      if (boxY < layout.top) {
        boxY = py + 10;
      }

      ctx.fillStyle = options.tooltipBg;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.fillStyle = options.tooltipColor;
      ctx.textBaseline = "middle";
      ctx.fillText(text, boxX + padX, boxY + boxHeight / 2);
      ctx.restore();
    },
    beforeDestroy(graph, context, options, api) {
      const state = api.getPluginState() || {};
      if (state.onMove) {
        graph.canvas.removeEventListener("mousemove", state.onMove);
      }
      if (state.onLeave) {
        graph.canvas.removeEventListener("mouseleave", state.onLeave);
      }
    }
  }
};
