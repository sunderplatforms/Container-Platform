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

The development overlay follows the mutable `development` tag published from the default branch. Its image pull policy is `Always`, so newly created pods use the current development image. Production overlays should instead use an immutable commit SHA or image digest.
