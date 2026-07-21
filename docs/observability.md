# Observability

## Application metrics

`fixture-service` exposes Prometheus metrics at `GET /metrics`.

| Metric | Meaning |
| --- | --- |
| `fixture_service_http_requests_total` | HTTP request count by method, route, and response status. |
| `fixture_service_http_request_duration_seconds` | HTTP request latency histogram by method, route, and response status. |
| `fixture_service_info` | Static service identity metric. |

Metrics intentionally use route templates rather than request values, preventing high-cardinality labels.

## Kubernetes discovery

The development overlay includes a `ServiceMonitor` with the label `release: kube-prometheus-stack`, targeting a chart installation with that Helm release name. If your monitoring release uses another name, update this label or configure Prometheus to select the service monitor explicitly.

Install the Prometheus Operator and Prometheus before applying this overlay. The operator must be configured to discover `ServiceMonitor` objects in `match-data`. Once installed, verify discovery with:

```sh
kubectl get servicemonitor -n match-data
kubectl port-forward -n platform-monitoring service/kube-prometheus-stack-prometheus 9090:9090
```

Then open the Prometheus targets page at `http://localhost:9090/targets` and confirm that `fixture-service` is `UP`.

## First dashboards and alerts

Create dashboards for request rate, 5xx responses, p95 request duration, pod restarts, CPU, and memory. Alert when the service is unavailable, error rate is sustained, or latency exceeds the team’s objective.
