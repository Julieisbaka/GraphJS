/**
 * First-party watermark extension for GraphJS.
 *
 * Draws a configurable text watermark after graph rendering and exposes
 * a command (`watermark.setText`) for runtime text updates.
 */
export const watermarkPlugin = {
  id: "watermark",
  priority: -5,
  defaults: {
    text: "graphjs",
    color: "rgba(15, 23, 42, 0.35)",
    font: "12px Segoe UI, sans-serif",
    offsetX: 12,
    offsetY: 12,
    enabled: true
  },
  install(graph, options, api) {
    api.registerCommand(
      "setText",
      (payload = {}) => {
        if (typeof payload.text === "string") {
          options.text = payload.text;
        }
        if (typeof payload.enabled === "boolean") {
          options.enabled = payload.enabled;
        }
        graph.render();
        return { text: options.text, enabled: options.enabled };
      },
      {
        description: "Set watermark text and enabled state",
        argsExample: { text: "qa run", enabled: true }
      }
    );
  },
  hooks: {
    afterRender(graph, context, options) {
      if (!options.enabled) {
        return;
      }

      const { width, height } = graph.options;

      graph.ctx.save();
      graph.ctx.fillStyle = options.color;
      graph.ctx.font = options.font;
      graph.ctx.textAlign = "right";
      graph.ctx.textBaseline = "bottom";
      graph.ctx.fillText(options.text, width - options.offsetX, height - options.offsetY);
      graph.ctx.restore();
    }
  }
};
