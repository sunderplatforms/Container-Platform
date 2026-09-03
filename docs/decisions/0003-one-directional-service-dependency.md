# ADR-0003: results-service depends on fixture-service, never the reverse

**Date:** 2026-09-03
**Status:** Accepted

## Context

A result references a `fixtureId`. Without any check, `results-service` would happily
persist a result against a `fixtureId` that doesn't exist in `fixture-service` at all - the
two services' data would drift apart from the very first write, with no way to tell a real
mismatch from a race during creation. The alternative - a combined view assembled by
`fixture-service` calling into `results-service` - was considered and rejected: it would
make the two services mutually dependent, and a circular service graph is exactly the kind
of coupling this platform is small enough to avoid paying for later.

## Decision

`results-service` calls `fixture-service`'s `GET /v1/fixtures/:id` before persisting a
result (`fixtureClient.exists()`, with a timeout). `fixture-service` has no code path that
calls `results-service`, and never will while this decision stands. A combined "fixture +
its result" view, if one is ever needed, gets built by querying both services from whatever
calls them, not by fixture-service reaching into results-service's data.

## Consequences

* No dependency cycle is possible between the two services, by construction, not by
  convention.
* `results-service`'s write path degrades in a specific, understood way when
  `fixture-service` is unreachable: `503`, not a guess. Reads (`GET /v1/results`) are
  unaffected - the dependency only applies to writes.
* The `NetworkPolicy` for each service (ADR-0005) can express this exactly: `results-service`
  is allowed egress to `fixture-service`; `fixture-service` has no egress rule for
  `results-service` and no ingress rule accepting it, and that was verified directly - a
  request from `fixture-service` to `results-service` gets connection-refused, not just an
  unused code path.
* Adds a network hop and a timeout to every result creation, in exchange for the guarantee.
