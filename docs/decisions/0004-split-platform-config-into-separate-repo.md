# ADR-0004: Deployment config lives in its own repo

**Date:** 2026-09-03
**Status:** Accepted

## Context

This repo used to hold application source, Kubernetes/ArgoCD manifests, and Kyverno
cluster policy together. That contradicted the platform's own stated model: the README
says platform namespaces and tenant namespaces are "managed by the platform team"
separately, but the repo didn't enforce that at all - a one-line fix to a service's
handler and a change to the `ClusterPolicy` enforcing resource limits on every tenant
could land in the same commit, reviewed (or not) by the same person. It's also the
conventional ArgoCD pattern: a GitOps config repo decoupled from the repos that produce
the images it deploys, so a compromised or careless commit to application source can't
also rewrite cluster-wide policy.

## Decision

Split `platform/` out into `alex-container-platform-gitops` via `git subtree split
--prefix=platform`, preserving its commit history rather than starting fresh. ArgoCD
watches that repo. Application source, tests, and CI stay here.

## Consequences

* Write access to Kyverno policy and tenant `ResourceQuota`s no longer has to be bundled
  with write access to any service's business logic.
* Real cost, felt directly while making this change: commits that used to be atomic across
  app code and its deployment manifest (the liveness/readiness probe paths, for one) now
  need two commits in two repos. Accepted deliberately, not overlooked.
* Local tooling needs both repos present: `scripts/dev-deploy.sh` looks for the platform
  repo as a sibling directory (`../alex-container-platform-gitops`, overridable via
  `PLATFORM_REPO_DIR`) and fails with clone instructions rather than a confusing `kubectl`
  error if it's missing.
* CI needs a credential with write access to a second repo to keep deployment config in
  sync (see ADR-0006) - one more secret to manage that a single-repo layout wouldn't have
  needed.
