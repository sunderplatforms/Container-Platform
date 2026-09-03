// Talks to fixture-service to confirm a fixtureId is real before results-service
// persists a result against it. This is the only cross-service dependency in the
// platform, and it's deliberately one-directional: results depend on fixtures,
// never the other way round, so the two services can't form a dependency cycle.
export function createFixtureClient({ baseUrl, fetchImpl = fetch, timeoutMs = 2000 }) {
  if (!baseUrl) throw new Error('A fixture-service base URL is required');

  return {
    // Resolves true/false for a definite answer, or rejects if fixture-service
    // couldn't be reached in time - the caller decides how to treat "unknown".
    async exists(fixtureId) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${baseUrl}/v1/fixtures/${encodeURIComponent(fixtureId)}`, {
          signal: controller.signal
        });
        if (response.status === 404) return false;
        if (!response.ok) throw new Error(`fixture-service responded with ${response.status}`);
        return true;
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}
