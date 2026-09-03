# Getting Started

## First vertical slice

The repository now includes `fixture-service`, a deliberately small API that establishes the delivery path for future product services.

It exposes:

* `GET /livez` for Kubernetes liveness checks (no dependency checks — the process is up)
* `GET /readyz` for Kubernetes readiness checks (confirms the database is reachable)
* `GET /v1/fixtures` to return seed fixture data
* `POST /v1/fixtures` to add a persisted fixture

Liveness and readiness are deliberately separate endpoints: liveness never checks the
database, so a transient database outage can't make Kubernetes restart otherwise-healthy
pods. Readiness does check the database, so Kubernetes stops routing traffic to a pod
that can't currently serve requests without killing it.

## Run locally

Install Node.js 20 or later and a PostgreSQL database, then run the migration followed by the service:

```sh
cd services/fixture-service
npm install
npm run migrate
npm test
npm start
```

In another terminal:

```sh
curl http://localhost:3000/livez
curl http://localhost:3000/readyz
curl http://localhost:3000/v1/fixtures
curl http://localhost:3000/metrics
```

## Build the service image

```sh
docker build -t fixture-service:0.1.0 services/fixture-service
```

## Run the complete local stack

Docker Compose starts PostgreSQL, applies the database migration, and starts the service:

```sh
docker compose up --build
```

## Deploy to Kubernetes

The workload manifests are in `platform/kubernetes/base/fixture-service`.

Create `fixture-service-database` in the target namespace with a `url` key before deployment. In a production environment, it should be synchronized from a secret manager by External Secrets rather than committed to Git.

```sh
kubectl apply -k platform/kubernetes/base/fixture-service
kubectl port-forward service/fixture-service 8080:80
curl http://localhost:8080/livez
curl http://localhost:8080/readyz
```

For a local Kind cluster, load the image before applying the manifests:

```sh
kind load docker-image fixture-service:0.1.0
```

## Deploy the complete local Kubernetes stack

For Rancher Desktop, this local overlay provisions PostgreSQL, runs the migration in an init-container, and deploys the service. It uses a development-only database password and a local persistent volume; do not use this overlay outside your laptop.

```sh
docker build -t fixture-service:local services/fixture-service
kubectl apply -k platform/kubernetes/tenants/match-data
kubectl apply -k platform/kubernetes/overlays/local/fixture-service
kubectl rollout status deployment/fixture-service -n match-data
kubectl port-forward -n match-data service/fixture-service 8080:80
```

Then verify the service in another terminal:

```sh
curl http://localhost:8080/livez
curl http://localhost:8080/readyz
curl http://localhost:8080/v1/fixtures
curl http://localhost:8080/metrics
```

## Continuous integration

GitLab CI runs the service tests and builds an image for every pipeline. Pipelines on the default branch publish the image to the GitLab Container Registry with an immutable commit-SHA tag and update the mutable `development` tag.

The Docker build job requires a GitLab runner capable of Docker-in-Docker. Configure that runner as privileged before enabling the pipeline. GitLab provides the registry credentials to the job through its predefined CI variables.

## Next implementation steps

1. Publish approved images to the GitLab Container Registry.
2. Add a `match-data` namespace and an Argo CD application.
3. Manage the production database credential with External Secrets.
