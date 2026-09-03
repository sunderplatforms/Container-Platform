# FPS (Football Platform Service)

## Start developing

Application source lives in this repo. Kubernetes and ArgoCD deployment manifests live in a separate repo, [alex-container-platform-gitops](https://gitlab.com/acp-group3273029/alex-container-platform-gitops) — see that repo's README for why they're split rather than combined. Clone it as a sibling of this repo before following the guides below.

Two services are scaffolded so far — `fixture-service` and `results-service` — each with a Node.js API, tests, a Docker image, and Kubernetes manifests; `results-service` validates a `fixtureId` against `fixture-service` before persisting a result. See [the getting-started guide](docs/getting-started.md) to run them locally or deploy them to a cluster.

The tenant model and Argo CD deployment definitions are documented in [the GitOps guide](docs/gitops.md).

Application metrics and Prometheus discovery are documented in [the observability guide](docs/observability.md).

Why things are built the way they are — and what each decision actually costs, not just what it buys — is recorded in [the architecture decision log](docs/decisions/).

## Vision

FPS is a cloud-native platform engineering project inspired by enterprise container platforms.

The purpose of ACP is to provide a secure, scalable and self-service platform that enables football application teams to deploy, operate and monitor services without managing the underlying infrastructure.

ACP abstracts the complexity of cloud infrastructure, Kubernetes operations, security, observability and networking, allowing development teams to focus on delivering business value through football applications.

⸻

## Mission

To provide a standardised platform that enables football product teams to build, deploy and operate services through automated, secure and observable workflows.

ACP aims to demonstrate modern platform engineering practices using AWS, Terraform, Kubernetes, GitOps and cloud-native technologies.

⸻

## Platform Users

### ACP serves multiple football-focused product teams.

Match Data Team

Responsible for:

* Fixtures
* Results
* League tables
* Match events

Example applications:

* match-service
* fixtures-service
* standings-service

⸻

## Analytics Team

Responsible for:

* Player statistics
* Team statistics
* xG calculations
* Performance insights

Example applications:

* analytics-service
* player-stats-service
* xg-service

⸻

## Fantasy Football Team

Responsible for:

* Fantasy game logic
* Team management
* Scoring systems
* Leaderboards

Example applications:

* fantasy-service
* scoring-service

⸻

## Fan Engagement Team

Responsible for:

* Notifications
* Polls
* Fan interaction
* Content delivery

Example applications:

* fan-service
* notification-service

⸻

## Platform Capabilities

ACP provides shared platform services to all product teams.

Infrastructure

* AWS
* Terraform
* VPC
* IAM
* EKS

Deployment

* GitLab
* ArgoCD
* GitOps workflows

Observability

* Prometheus
* Grafana
* Loki
* Alertmanager

Networking

* Calico
* Istio
* Ingress
* DNS

Security

* cert-manager
* External Secrets
* Kyverno
* RBAC

Operations

* Karpenter
* Backups
* Platform monitoring
* Cost optimisation

⸻

## Tenant Model

Each football product team is treated as a tenant of the platform.

Example namespaces:

* match-data
* analytics
* fantasy-football
* fan-engagement

Platform namespaces remain separate from tenant namespaces and are managed by the platform team.

⸻

## Long Term Goal

ACP will evolve into a fully functional platform capable of hosting multiple football microservices while providing enterprise-grade platform capabilities including:

* Self-service deployments
* GitOps automation
* Centralised observability
* Secure secret management
* Service mesh capabilities
* Policy enforcement
* Multi-tenant workload hosting

The project serves as both a learning platform and a portfolio demonstration of platform engineering principles inspired by real-world enterprise container platforms.
