# GitOps Deployment

## Two repos

Deployment config lives in a separate repo from application source:
[`alex-container-platform-gitops`](https://gitlab.com/acp-group3273029/alex-container-platform-gitops).
ArgoCD watches that repo, not this one - a change to a service's business logic and a
change to its deployment topology (replica count, resource limits, tenant policy)
shouldn't require the same repo, or the same commit, to make either one. See that repo's
README for why, and its layout.

## What is included

`match-data` is the first tenant namespace. It has a resource quota and default container resource values.

The development overlay deploys one replica of each service (`fixture-service`, `results-service`), references an image in the GitLab Container Registry, and creates each service's database secret through External Secrets. Each workload uses a dedicated service account without a mounted API token and runs with a restricted container security context.

Argo CD Applications reconcile the tenant resources and both services' development overlays.

## One-time configuration

Application source and images are published from `acp-group3273029/alex-container-platform` (this repo). Deployment manifests live in `acp-group3273029/alex-container-platform-gitops`.

CI needs push access to the GitOps repo to pin the development overlay to the commit it just built (see Image promotion below). Create a Project Access Token on `alex-container-platform-gitops` (Settings → Access Tokens), role **Developer**, scope **`write_repository`** only. Add it as a CI/CD variable named `GITOPS_DEPLOY_TOKEN` on `alex-container-platform` (Settings → CI/CD → Variables), marked **Masked** and **Protected**.

The cluster must have Argo CD and External Secrets installed, plus a `ClusterSecretStore` named `aws-secrets-manager`. Store these JSON objects in AWS Secrets Manager:

```json
// match-data/development/fixture-service
{
  "databaseUrl": "postgresql://USER:PASSWORD@HOST:5432/matchops"
}
```

```json
// match-data/development/results-service
{
  "databaseUrl": "postgresql://USER:PASSWORD@HOST:5432/matchops"
}
```

## Bootstrap

After configuring the placeholders and the secret store, clone the GitOps repo and apply its Argo CD Applications:

```sh
git clone git@gitlab.com:acp-group3273029/alex-container-platform-gitops.git
kubectl apply -k alex-container-platform-gitops/argocd/applications
```

Argo CD will create the tenant namespace and reconcile both services into it.

## Image promotion

On the default branch, after an image is built and pushed, a `promote` stage job clones
`alex-container-platform-gitops`, rewrites the development overlay's `newTag` to
`$CI_COMMIT_SHA`, and pushes that commit - so the overlay always points at the exact
commit that produced the image, not a moving target. ArgoCD's automated sync then rolls
that commit out.

The `:development` registry tag is still published alongside the SHA tag for convenience
(pulling "whatever's newest" by hand), but nothing in the deployed manifests references it
- the overlay only ever tracks a specific commit SHA. If the promote job's commit finds
the overlay already pinned to that SHA (re-running a pipeline, or nothing changed), it's a
no-op rather than an empty commit.

Production overlays would follow the same pattern, likely promoted through a manual
approval gate rather than automatically on every default-branch push.
