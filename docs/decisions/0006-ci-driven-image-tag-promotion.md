# ADR-0006: CI pins the deployed image tag to the exact commit SHA

**Date:** 2026-09-03
**Status:** Accepted

## Context

The development overlay tracked a mutable `:development` registry tag. The build job
already tagged and pushed an immutable `$CI_COMMIT_SHA` image and wrote it to a dotenv
artifact, but nothing downstream ever consumed that artifact - a deploy couldn't be traced
back to the commit that produced it. The practical version of this problem showed up
directly during local development, on the `local` overlay rather than `development`:
rebuilding an image under the same fixed tag produced no manifest diff, so `kubectl apply
-k` saw nothing to change and kept running the stale build until a manual `kubectl rollout
restart`. Different overlay, same underlying issue - a floating tag can't tell two
different builds apart.

## Decision

A `promote` CI stage runs after a successful build, on the default branch only: it clones
`alex-container-platform-gitops`, rewrites the development overlay's `newTag` to
`$CI_COMMIT_SHA`, and pushes that commit - a no-op if it's already pinned there. ArgoCD's
automated sync (where an `Application` is registered against a given cluster) rolls the
change out from there. The `:development` tag is still pushed for convenience, but nothing
deployed references it anymore.

## Consequences

* Every deploy is traceable to an exact commit, both directions: the gitops repo's commit
  message links back to the pipeline and source commit; the overlay itself never says
  anything vaguer than a specific SHA.
* Needs a credential with write access to a second repo (`GITOPS_DEPLOY_TOKEN`, scoped to
  `write_repository` only, unprotected since this repo has no branch protection policy yet)
  - one more secret whose scope and rotation now matter.
* Getting this working end-to-end took real failures, each a genuine gap in verification
  rather than the mechanism itself being wrong: the promote job's image (`alpine/git`) sets
  `ENTRYPOINT git`, which silently broke every script line until `entrypoint: [""]` reset
  it; and acquiring a working credential took longer than either pipeline failure - a
  GitLab "fine-grained" personal access token with none of the right permissions, Project
  Access Token creation turning out to be disabled at the group level, before a "Legacy"
  personal access token scoped to `write_repository` actually worked. Full account, including
  what was verified and how, in [the postmortem](../postmortems/2026-09-03-ci-promote-rollout.md).
