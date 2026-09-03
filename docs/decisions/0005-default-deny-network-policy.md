# ADR-0005: Default-deny NetworkPolicy baseline

**Date:** 2026-09-03
**Status:** Accepted

## Context

The `match-data` namespace had no `NetworkPolicy` at all - every pod could reach every
other pod regardless of whether it had any reason to, despite the README listing Calico
and network isolation as a platform capability. The claim and the enforcement had drifted
apart.

## Decision

A namespace-wide default-deny `NetworkPolicy` (`podSelector: {}`, both directions), plus
one additive allow policy per workload matching the platform's actual traffic paths:
Traefik to each service, `results-service` to `fixture-service` only (never the reverse -
see ADR-0003), and each service to its own Postgres only.

## Consequences

* A pod not covered by an explicit allow policy can reach nothing in the namespace, and
  can't even resolve DNS for a service name - verified directly with a disposable pod
  dropped into the namespace, not assumed from the manifest.
* Any new workload added to `match-data` is unreachable, and can reach nothing, until its
  own `NetworkPolicy` is written. That's the intended failure mode (secure by default), but
  it's a real onboarding step future services need to remember, not something that happens
  automatically.
* Caught during this work, not after: the first version of these manifests omitted
  `metadata.namespace`, and since this tenant's `Kustomization` has no namespace
  transformer, `kubectl apply -k` silently created all five policies in the `default`
  namespace instead - entirely inert. `kubectl get networkpolicy -n match-data` returning
  nothing after an apparently successful apply was the signal; fixed by matching the
  existing convention in `resource-quota.yaml` and `limit-range.yaml` (namespace set
  explicitly per manifest, since there's no transformer to rely on).
