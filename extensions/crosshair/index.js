/**
 * First-party crosshair extension for GraphJS.
 *
 * Renders optional vertical and horizontal guide lines and exposes
 * a command (`crosshair.set`) for runtime updates.
 */
export const crosshairPlugin = {
  id: "crosshair",
  defaults: {
    color: "rgba(15, 23, 42, 0.35)",
    lineWidth: 1,
    x: null,
    y: null,
    enabled: true
  },
  install(graph, options, api) {
    api.registerCommand(
      "set",
      (payload = {}) => {
        options.x = Number.isFinite(payload.x) ? payload.x : options.x;
        options.y = Number.isFinite(payload.y) ? payload.y : options.y;
        if (typeof payload.enabled === "boolean") {
          options.enabled = payload.enabled;
        }
        graph.render();
        return { x: options.x, y: options.y, enabled: options.enabled };
      },
      {
        description: "Set crosshair coordinates and enabled state",
        argsExample: { x: 300, y: 160, enabled: true }
      }
    );
  },
  hooks: {
    afterRender(graph, context, options) {
      if (!options.enabled) {
        return;
      }

      const { layout } = context;
      if (!layout) {
        return;
      }

      const x = Number.isFinite(options.x) ? options.x : null;
      const y = Number.isFinite(options.y) ? options.y : null;

      graph.ctx.save();
      graph.ctx.strokeStyle = options.color;
      graph.ctx.lineWidth = options.lineWidth;

      if (x !== null) {
        graph.ctx.beginPath();
        graph.ctx.moveTo(x, layout.top);
        graph.ctx.lineTo(x, layout.bottom);
        graph.ctx.stroke();
      }

      if (y !== null) {
        graph.ctx.beginPath();
        graph.ctx.moveTo(layout.left, y);
        graph.ctx.lineTo(layout.right, y);
        graph.ctx.stroke();
      }

      graph.ctx.restore();
    }
  }
};
