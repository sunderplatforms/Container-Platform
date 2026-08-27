const durationBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function escapeLabel(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export class MetricsRegistry {
  constructor() {
    this.requests = new Map();
    this.durations = new Map();
  }

  record({ method, route, statusCode, durationSeconds }) {
    const labels = { method, route, status_code: statusCode };
    const key = JSON.stringify(labels);
    this.requests.set(key, (this.requests.get(key) ?? 0) + 1);

    const histogram = this.durations.get(key) ?? { buckets: new Map(), count: 0, sum: 0 };
    for (const bucket of durationBuckets) {
      if (durationSeconds <= bucket) histogram.buckets.set(bucket, (histogram.buckets.get(bucket) ?? 0) + 1);
    }
    histogram.count += 1;
    histogram.sum += durationSeconds;
    this.durations.set(key, histogram);
  }

  render() {
    const lines = [
      '# HELP results_service_info Static information about the running service.',
      '# TYPE results_service_info gauge',
      'results_service_info{service="results-service"} 1',
      '# HELP results_service_http_requests_total Total HTTP requests handled by the service.',
      '# TYPE results_service_http_requests_total counter'
    ];

    for (const [key, count] of this.requests) {
      const labels = JSON.parse(key);
      lines.push(`results_service_http_requests_total{method="${escapeLabel(labels.method)}",route="${escapeLabel(labels.route)}",status_code="${escapeLabel(labels.status_code)}"} ${count}`);
    }

    lines.push('# HELP results_service_http_request_duration_seconds HTTP request duration in seconds.');
    lines.push('# TYPE results_service_http_request_duration_seconds histogram');
    for (const [key, histogram] of this.durations) {
      const labels = JSON.parse(key);
      const base = `method="${escapeLabel(labels.method)}",route="${escapeLabel(labels.route)}",status_code="${escapeLabel(labels.status_code)}"`;
      for (const bucket of durationBuckets) {
        lines.push(`results_service_http_request_duration_seconds_bucket{${base},le="${bucket}"} ${histogram.buckets.get(bucket) ?? 0}`);
      }
      lines.push(`results_service_http_request_duration_seconds_bucket{${base},le="+Inf"} ${histogram.count}`);
      lines.push(`results_service_http_request_duration_seconds_sum{${base}} ${histogram.sum}`);
      lines.push(`results_service_http_request_duration_seconds_count{${base}} ${histogram.count}`);
    }

    return `${lines.join('\n')}\n`;
  }
}
