#!/usr/bin/env bash
# Build and deploy a service to the local Rancher Desktop cluster, guaranteeing a
# real rollout every time.
#
# The local overlays pin images with a fixed tag (":local") and
# imagePullPolicy: Never, which is what lets Kubernetes use an image built
# straight into the cluster's own image store instead of pulling from a
# registry. The cost is that `kubectl apply -k` alone can't tell a rebuilt
# image apart from the one already running: the manifest text didn't change,
# so it sees no diff and never recreates the pod - the cluster keeps serving
# whatever was built last time, silently.
#
# This script sidesteps that by giving every build its own timestamped tag,
# then pointing the deployment (and its migrate init container) at that exact
# tag with `kubectl set image`. A new tag is always a manifest change, so a
# rollout always happens.
#
# Usage:
#   scripts/dev-deploy.sh                        # build + deploy every service
#   scripts/dev-deploy.sh fixture-service         # build + deploy just one
#   scripts/dev-deploy.sh fixture-service results-service

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE=match-data
ALL_SERVICES=(fixture-service results-service)

services=("$@")
if [ ${#services[@]} -eq 0 ]; then
  services=("${ALL_SERVICES[@]}")
fi

deploy_one() {
  local service="$1"
  local overlay="$REPO_ROOT/platform/kubernetes/overlays/local/$service"

  if [ ! -d "$overlay" ]; then
    echo "error: no local overlay for '$service' at $overlay" >&2
    exit 1
  fi

  local tag="local-$(date +%Y%m%d%H%M%S)"
  local image="$service:$tag"

  # --pull=false: don't check the registry for a newer base image on every
  # build. This is a local dev loop you'll run often - it should be fast and
  # deterministic. Pull a fresh base image deliberately (plain `docker pull`)
  # when you actually want one.
  echo "==> [$service] building $image"
  docker build --pull=false -t "$image" "$REPO_ROOT/services/$service"

  echo "==> [$service] applying manifests"
  kubectl apply -k "$overlay"

  echo "==> [$service] pointing deployment at $image"
  kubectl set image "deployment/$service" \
    "$service=$image" \
    "migrate=$image" \
    -n "$NAMESPACE"

  echo "==> [$service] waiting for rollout"
  kubectl rollout status "deployment/$service" -n "$NAMESPACE"
}

for service in "${services[@]}"; do
  deploy_one "$service"
done
