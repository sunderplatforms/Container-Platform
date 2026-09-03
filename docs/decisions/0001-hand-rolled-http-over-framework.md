# ADR-0001: Hand-rolled HTTP instead of a framework

**Date:** 2026-07-21
**Status:** Accepted

## Context

`fixture-service` and `results-service` each expose two or three routes. A framework like
Express or Fastify brings a middleware chain, a routing abstraction, and its own dependency
tree - real value once a service has dozens of routes and needs auth middleware, request
validation libraries, and so on, but overhead to learn, configure, and debug at this size
for very little payoff.

## Decision

Use Node's built-in `http` module directly. `createHandler({ repository, fixtureClient,
now, metrics })` is a small factory that takes its dependencies as arguments and returns a
plain `(request, response) => {}` function; routing is an explicit method+path if-chain in
`app.js`. `server.js` is the only place that constructs real dependencies (`PostgresXRepository`,
`createFixtureClient`) and wires them into `createHandler`.

## Consequences

* `package.json` lists exactly one runtime dependency (`pg`) per service - a smaller image,
  fewer supply-chain surfaces, nothing to patch when a framework ships a CVE.
* Full visibility into request handling: the Prometheus metrics recording in `app.js` is
  about ten lines, not a framework plugin with its own configuration surface.
* Testing is direct - `createHandler` is called with fake repositories/clients in unit
  tests, no framework test harness or supertest-style wrapper needed.
* Cost accepted knowingly: the if-chain router in `app.js` already needed a regex for
  `/v1/fixtures/:id`, and won't scale gracefully much past that - a real router (or a
  minimal framework) becomes the right call once route count grows past what one file can
  hold clearly. Revisit then, not preemptively.
