# FPS Architecture v1

MatchOps - 

A platform engineering project inspired by Container Platforms.

Provides a self-service Kubernetes platform for football product teams including match data, analytics, fantasy football and fan engagement services.


High Level Architecture

GitLab is the source of truth for both infrastructure and platform configuration.

Terraform provisions cloud infrastructure.

ArgoCD continuously reconciles Kubernetes resources from GitLab into the cluster.

Football product teams deploy applications onto the platform through GitOps workflows.

Flow:

GitLab

↓

Terraform

↓

AWS

↓

EKS

↓

ArgoCD

↓

Platform Services

↓

Football Applications

⸻

Platform Domains

ACP is divided into several platform domains.

Core Platform

Purpose:

Provides the Kubernetes foundation and cluster-level services required for platform operation.

Namespaces:

* kube-system
* kube-public
* kube-node-lease
* platform-system

Owner:

Platform Team

⸻

Networking Domain

Purpose:

Provides connectivity, ingress, service-to-service communication and network security.

Namespaces:

* calico-system
* calico-apiserver
* platform-ingress
* platform-dns
* platform-mesh
* istio-system

Technologies:

* Calico
* Istio
* External DNS
* Ingress Controller

Owner:

Platform Team

⸻

Observability Domain

Purpose:

Provides monitoring, logging, alerting and operational visibility.

Namespaces:

* platform-monitoring
* platform-logging
* platform-tracing

Technologies:

* Prometheus
* Grafana
* Alertmanager
* Fluent Bit
* OpenSearch

Owner:

Platform Team

⸻

Security Domain

Purpose:

Provides security controls, secrets management, identity and policy enforcement.

Namespaces:

* platform-certificates
* platform-secrets
* platform-identity
* platform-scanning
* platform-threat-detection
* system-policy
* platform-webhook

Technologies:

* cert-manager
* External Secrets
* Kyverno
* Trivy Operator

Owner:

Platform Team

⸻

Operations Domain

Purpose:

Provides automation, cost optimisation, scaling and platform operations.

Namespaces:

* platform-autoscaling
* platform-backups
* platform-finops
* platform-ci

Technologies:

* Karpenter
* Backup tooling
* Cost optimisation tooling

Owner:

Platform Team

⸻

Tenant Domain

Purpose:

Hosts football applications and business services.

Namespaces:

* match-data
* analytics
* fantasy-football
* fan-engagement

Owner:

Football Product Teams

⸻

Football Product Teams

Match Data Team

Services:

* fixture-service
* results-service
* league-table-service

⸻

Analytics Team

Services:

* player-stats-service
* team-stats-service
* xg-service

⸻

Fantasy Football Team

Services:

* fantasy-service
* scoring-service

⸻

Fan Engagement Team

Services:

* notification-service
* fan-service

⸻

Technology Stack

Capability	Technology
Source Control	GitLab
Infrastructure as Code	Terraform
Cloud Platform	AWS
Container Platform	EKS
GitOps	ArgoCD
Monitoring	Prometheus
Dashboards	Grafana
Logging	Fluent Bit + OpenSearch
Certificates	cert-manager
Secrets	External Secrets
Networking	Calico
Service Mesh	Istio
Policy	Kyverno
Vulnerability Scanning	Trivy
Autoscaling	Karpenter

⸻

Cluster Strategy v1

ACP will initially consist of a single EKS cluster.

Purpose:

* Simplify development
* Reduce AWS costs
* Accelerate learning

Future versions may introduce:

* Management Cluster
* Development Cluster
* Production Cluster

as the platform matures.

⸻

Design Principles

* GitLab is the source of truth.
* All infrastructure is provisioned using Terraform.
* All Kubernetes resources are deployed using GitOps.
* Platform services are isolated from tenant workloads.
* Security and observability are built into the platform by default.
* Platform capabilities are provided as shared services for all football product teams.