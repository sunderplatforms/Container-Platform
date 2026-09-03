# ADR-0007: PodDisruptionBudget in base, HorizontalPodAutoscaler in the development overlay only

**Date:** 2026-09-03
**Status:** Accepted

## Context

Neither existed despite `base`'s `deployment.yaml` setting `replicas: 2` - no guaranteed
availability during a voluntary disruption (node drain, cluster upgrade), and no way to
absorb load beyond whatever a fixed replica count happened to provide. But `base`'s
`replicas: 2` isn't what actually runs anywhere: both the `local` and `development`
overlays independently patch it down to `1`, for cost/resource reasons. An HPA placed in
`base` with `minReplicas: 2` would fight that patch directly - the HPA controller
continuously reconciling replicas back up to 2 against the overlay's deliberate choice to
run 1.

## Decision

`PodDisruptionBudget` (`minAvailable: 1`) goes in `base`, matching `base`'s real redundancy
intent (`replicas: 2`) rather than any one overlay's patched reality - it applies uniformly
and doesn't conflict with either overlay's replica patch, since a PDB doesn't set a replica
count, only a floor on voluntary disruption.

`HorizontalPodAutoscaler` goes in the `development` overlay only, with `minReplicas: 1` -
matching that overlay's own patched baseline exactly, so there's nothing to fight - and
`maxReplicas: 4`. It scales up from the deliberately cheap idle baseline under real load,
and back down to it once load subsides. Not in `local`: a laptop dev cluster has nothing
to scale into, and `local`'s entire point is running the smallest footprint that still
works.

## Consequences

* At the replica count every overlay that exists today actually runs (1), the PDB blocks
  *any* voluntary eviction of that pod - proven directly, not assumed: a real eviction
  request against the live cluster at 1 replica returned
  `429 Cannot evict pod as it would violate the pod's disruption budget`; the identical
  request against 2 replicas succeeded. That's the honest consequence of choosing to run
  one replica for cost, not a flaw in the PDB - there's no spare capacity to protect *or*
  to sacrifice.
* The PDB's protection becomes meaningful exactly when the HPA has scaled out under load -
  deliberate synergy between the two, not a coincidence of where each one lives.
* This app is too lightweight to reach even a modest CPU target through realistic HTTP
  load in any reasonable test window - forty concurrent request loops against
  `GET /v1/fixtures` for 90 seconds moved usage from ~2% to ~6% of a 70%-utilization
  target, nowhere close to triggering a scale-out. The scale-*out* mechanism itself was
  proven directly instead: metrics-server integration confirmed via real (non-`<unknown>`)
  current-vs-target numbers, then an artificially low target applied standalone (never
  committed) to force a genuine scale event - 1 replica to 4 (the ceiling) within about 15
  seconds, through the real HPA controller and the real Deployment, not a mock.
* `minReplicas: 1` means a burst that outlasts a single pod's capacity has no floor of
  redundancy to fall back on until the HPA reacts - accepted deliberately, matching the
  same cost-over-redundancy choice already made by patching `replicas: 1` at all.
