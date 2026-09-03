# Architecture decisions

Short records of decisions that shaped this platform, written at the time they were made.
Each one includes the tradeoff accepted, not just the choice - a decision with no cost
attached usually means the cost hasn't been found yet.

* [0001 - Hand-rolled HTTP instead of a framework](0001-hand-rolled-http-over-framework.md)
* [0002 - Separate liveness and readiness endpoints](0002-liveness-readiness-split.md)
* [0003 - results-service depends on fixture-service, never the reverse](0003-one-directional-service-dependency.md)
* [0004 - Deployment config lives in its own repo](0004-split-platform-config-into-separate-repo.md)
* [0005 - Default-deny NetworkPolicy baseline](0005-default-deny-network-policy.md)
* [0006 - CI pins the deployed image tag to the exact commit SHA](0006-ci-driven-image-tag-promotion.md)
