# Getting Started

## First vertical slice

The repository includes two services that establish the delivery path for future product services: `fixture-service` and `results-service`.

`fixture-service` exposes:

* `GET /livez` for Kubernetes liveness checks (no dependency checks — the process is up)
* `GET /readyz` for Kubernetes readiness checks (confirms the database is reachable)
* `GET /v1/fixtures` to return seed fixture data
* `GET /v1/fixtures/:id` to return a single fixture, or `404` if it doesn't exist
* `POST /v1/fixtures` to add a persisted fixture

`results-service` exposes the same `/livez`, `/readyz` and `/metrics` shape, plus:

* `GET /v1/results` to list results, or `GET /v1/results?fixtureId=<id>` to filter to one fixture
* `POST /v1/results` to record a result

Liveness and readiness are deliberately separate endpoints on both services: liveness
never checks the database, so a transient database outage can't make Kubernetes restart
otherwise-healthy pods. Readiness does check the database, so Kubernetes stops routing
traffic to a pod that can't currently serve requests without killing it.

### Service dependency: results-service depends on fixture-service

`results-service` calls `fixture-service`'s `GET /v1/fixtures/:id` before persisting a
result, so a result can never reference a `fixtureId` that doesn't exist. The dependency
is one-directional — `fixture-service` has no knowledge of `results-service` — so the two
services can't form a cycle. `results-service` needs a `FIXTURE_SERVICE_URL` environment
variable pointing at `fixture-service` to start.

If `fixture-service` can't be reached within the client's timeout, `POST /v1/results`
returns `503` rather than guessing; if it responds but the fixture genuinely doesn't
exist, it returns `400`.

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

`results-service` follows the same pattern, but also needs `FIXTURE_SERVICE_URL` set to
wherever `fixture-service` is reachable (e.g. `http://localhost:3000`) before it will start.

## Build the service images

```sh
docker build -t fixture-service:0.1.0 services/fixture-service
docker build -t results-service:0.1.0 services/results-service
```

## Run the complete local stack

Docker Compose starts a dedicated PostgreSQL per service, applies each database
migration, and starts both services in dependency order — `results-service` won't
start until `fixture-service` reports healthy on `/readyz`:

```sh
docker compose up --build
```

```sh
curl http://localhost:3000/v1/fixtures                 # fixture-service
curl http://localhost:3001/v1/results                   # results-service
```

## Deploy to Kubernetes

The workload manifests are in `platform/kubernetes/base/fixture-service` and `platform/kubernetes/base/results-service`. Deploy `fixture-service` first — `results-service`'s base manifest already points `FIXTURE_SERVICE_URL` at `http://fixture-service` in the same namespace.

Create `fixture-service-database` and `results-service-database` in the target namespace, each with a `url` key, before deployment. In a production environment, these should be synchronized from a secret manager by External Secrets rather than committed to Git.

```sh
kubectl apply -k platform/kubernetes/base/fixture-service
kubectl apply -k platform/kubernetes/base/results-service
kubectl port-forward service/fixture-service 8080:80
curl http://localhost:8080/livez
curl http://localhost:8080/readyz
```

For a local Kind cluster, load the images before applying the manifests:

```sh
kind load docker-image fixture-service:0.1.0
kind load docker-image results-service:0.1.0
```

## Deploy the complete local Kubernetes stack

For Rancher Desktop, these local overlays each provision PostgreSQL, run the migration in an init-container, and deploy the service. They use development-only database passwords and local persistent volumes; do not use them outside your laptop.

First, create the tenant namespace once:

```sh
kubectl apply -k platform/kubernetes/tenants/match-data
```

Then build and deploy with `scripts/dev-deploy.sh`:

```sh
scripts/dev-deploy.sh                        # both services
scripts/dev-deploy.sh fixture-service        # just one
kubectl port-forward -n match-data service/fixture-service 8080:80
```

Both overlays pin the image to a fixed `local` tag with `imagePullPolicy: Never`, which is
what lets the cluster run an image built straight into its own image store instead of
pulling from a registry - but it also means a plain `kubectl apply -k` can't tell a
rebuilt image apart from the one already running: the manifest text didn't change, so it
sees no diff and never recreates the pod. `scripts/dev-deploy.sh` avoids that by tagging
every build with a timestamp and pointing the deployment at that exact tag with
`kubectl set image`, so a rebuild always produces a real rollout. Use it instead of
running `docker build` and `kubectl apply -k` by hand.

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

1. Pin the development overlays to the CI-built commit-SHA image tag instead of the mutable `development` tag, so a deploy is always traceable back to the commit that produced it.
2. Add `NetworkPolicy` manifests for the `match-data` tenant — Calico is installed, but nothing in the repo enforces namespace isolation with it yet.
3. Add an integration test for each `PostgresRepository` against a real Postgres instance; current tests only exercise the HTTP layer with the repository mocked out.
