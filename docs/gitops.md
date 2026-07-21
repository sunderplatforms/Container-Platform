# GitOps Deployment

## What is included

`match-data` is the first tenant namespace. It has a resource quota and default container resource values.

The development overlay deploys one `fixture-service` replica, references an image in the GitLab Container Registry, and creates the `fixture-service-database` Kubernetes secret through External Secrets. The workload uses a dedicated service account without a mounted API token and runs with a restricted container security context.

Argo CD Applications reconcile both the tenant resources and the development service overlay.

## One-time configuration

The repository and GitLab Container Registry are configured for `acp-group3273029/alex-container-platform`.

The cluster must have Argo CD and External Secrets installed, plus a `ClusterSecretStore` named `aws-secrets-manager`. Store this JSON object in AWS Secrets Manager at `match-data/development/fixture-service`:

```json
{
  "databaseUrl": "postgresql://USER:PASSWORD@HOST:5432/matchops"
}
```

## Bootstrap

After configuring the placeholders and the secret store:

```sh
kubectl apply -k platform/argocd/applications
```

Argo CD will create the tenant namespace and reconcile `fixture-service` into it.

## Image promotion

The development overlay follows the mutable `development` tag published from the default branch. Its image pull policy is `Always`, so newly created pods use the current development image. Production overlays should instead use an immutable commit SHA or image digest.
