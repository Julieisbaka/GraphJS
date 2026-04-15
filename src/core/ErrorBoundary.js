/**
 * Encapsulates plugin error handling behaviour.
 *
 * When `enabled` is `true` (the default), errors are swallowed after invoking
 * the optional `onError` callback and logging to the console — keeping the
 * graph alive when a single plugin misbehaves.
 *
 * When `enabled` is `false`, errors are rethrown immediately so the caller
 * receives them directly.
 *
 * @example
 * const boundary = new ErrorBoundary({ enabled: true, onError: ({ pluginId, error }) => report(error) });
 * boundary.handle("my-plugin", "install", err);
 */
export class ErrorBoundary {
  constructor(settings = {}) {
    this.enabled = settings.enabled !== false;
    this.onError = settings.onError ?? null;
  }

  handle(pluginId, phase, error, context = {}) {
    if (!this.enabled) {
      throw error;
    }

    if (typeof this.onError === "function") {
      try {
        this.onError({ pluginId, phase, error, context });
      } catch {
        // no-op: avoid recursive error loops in error handlers
      }
    }

    // eslint-disable-next-line no-console
    console.error(`[GraphJS] Plugin error (${pluginId} @ ${phase})`, error);
  }
}
