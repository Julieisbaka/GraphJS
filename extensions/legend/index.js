/**
 * First-party legend extension for GraphJS.
 *
 * Draws a compact legend box for visible series and exposes
 * a command (`legend.set`) to control position and enabled state.
 */
export const legendPlugin = {
  id: "legend",
  priority: -1,
  defaults: {
    enabled: true,
    position: "top-right",
    background: "rgba(255,255,255,0.9)",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    textColor: "#0f172a",
    font: "12px Segoe UI, sans-serif",
    itemSpacing: 8,
    markerSize: 10,
    padding: 10,
    maxItems: 20
  },
  install(graph, options, api) {
    api.registerCommand(
      "set",
      (payload = {}) => {
        if (typeof payload.enabled === "boolean") {
          options.enabled = payload.enabled;
        }
        if (typeof payload.position === "string") {
          options.position = payload.position;
        }
        api.requestRender();
        return { enabled: options.enabled, position: options.position };
      },
      {
        description: "Set legend enabled and position",
        argsExample: { enabled: true, position: "bottom-left" }
      }
    );
  },
  hooks: {
    afterRender(graph, context, options) {
      if (!options.enabled) {
        return;
      }

      const visibleSeries = graph.data.filter((s) => s.visible !== false).slice(0, options.maxItems);
      if (!visibleSeries.length) {
        return;
      }

      const { layout } = context;
      const ctx = graph.ctx;
      ctx.save();
      ctx.font = options.font;

      const itemHeight = Math.max(14, options.markerSize + 2);
      const textWidths = visibleSeries.map((s) => ctx.measureText(s.id || "series").width);
      const contentWidth = Math.max(...textWidths) + options.markerSize + 10;
      const boxWidth = Math.ceil(contentWidth + options.padding * 2);
      const boxHeight = Math.ceil(
        visibleSeries.length * itemHeight + (visibleSeries.length - 1) * options.itemSpacing + options.padding * 2
      );

      let x = layout.right - boxWidth;
      let y = layout.top;

      if (options.position === "top-left") {
        x = layout.left;
      } else if (options.position === "bottom-left") {
        x = layout.left;
        y = layout.bottom - boxHeight;
      } else if (options.position === "bottom-right") {
        y = layout.bottom - boxHeight;
      }

      ctx.fillStyle = options.background;
      ctx.strokeStyle = options.borderColor;
      ctx.lineWidth = options.borderWidth;
      ctx.beginPath();
      ctx.rect(x, y, boxWidth, boxHeight);
      ctx.fill();
      if (options.borderWidth > 0) {
        ctx.stroke();
      }

      let cursorY = y + options.padding;
      for (const series of visibleSeries) {
        const markerY = cursorY + Math.floor((itemHeight - options.markerSize) / 2);

        ctx.fillStyle = series.color || "#3b82f6";
        ctx.fillRect(x + options.padding, markerY, options.markerSize, options.markerSize);

        ctx.fillStyle = options.textColor;
        ctx.textBaseline = "middle";
        ctx.fillText(
          series.id || "series",
          x + options.padding + options.markerSize + 8,
          cursorY + itemHeight / 2
        );

        cursorY += itemHeight + options.itemSpacing;
      }

      ctx.restore();
    }
  }
};
