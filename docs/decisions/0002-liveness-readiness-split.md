# ADR-0002: Separate liveness and readiness endpoints

**Date:** 2026-09-03
**Status:** Accepted

## Context

Both services originally exposed a single `/health` endpoint that checked the database
(`repository.isReady()`) and backed both the Kubernetes liveness and readiness probes.
That conflates two different questions: "is this process alive" and "can this process
currently serve traffic." With one endpoint answering both, a transient Postgres outage
would fail the liveness probe too, and Kubernetes would restart otherwise-healthy pods -
adding pod churn on top of a database problem that a restart does nothing to fix.

## Decision

Split into `/livez` (no dependency checks - reports `200` as long as the process can
respond at all) and `/readyz` (checks the database, same behavior the old `/health` had).
`livenessProbe` points at `/livez`, `readinessProbe` at `/readyz`.

## Consequences

* A database blip pulls pods out of the Service's endpoint list (readiness fails) without
  restarting them (liveness stays green) - traffic stops routing there, but the process
  doesn't churn, and it rejoins automatically once the database recovers.
* One more endpoint per service to document and keep in the metrics route allowlist.
* The new failure mode is testable directly: `test/app.test.js` asserts `/livez` stays
  `200` even when the injected repository throws, and `/readyz` returns `503` when it
  does - coverage the old single-endpoint design had no equivalent test for.
