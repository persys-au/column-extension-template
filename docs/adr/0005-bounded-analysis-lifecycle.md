# ADR 0005: Bounded Analysis Lifecycle

- Status: accepted
- Date: 2026-09-27

## Context

Generated products receive page-derived input from a browser and may forward it to a server-side
analysis provider. The input can be malformed, unexpectedly large, or tied to a sidebar request that
is no longer relevant after the reader changes tabs or refreshes the page. A provider request that
continues after its caller has abandoned the workflow wastes resources and can produce stale results.

The sibling Oristry project validates strict, bounded JSON at its HTTP routes and keeps cancellation
as runtime lifecycle state rather than putting it in the serialized analysis contract. Those parts are
useful across products. Oristry's process-local reference-selection cache and refresh control are
not generic because their cache identity, privacy implications, and invalidation policy depend on
that product's retrieval workflow.

## Decision

1. The server composition root installs strict JSON parsing with a configurable body limit. The
   default limit is 1 MB. Product routes still validate their own request schemas after transport
   parsing.
2. Parser failures return JSON errors: malformed JSON returns HTTP 400 and an oversized body returns
   HTTP 413. The server does not expose the parser's HTML fallback or raw error details.
3. `AnalysisService` accepts an optional caller-owned `AbortSignal` separately from the serialized
   `AnalysisRequest`. It composes caller cancellation with the service-owned provider timeout and
   passes the resulting signal to the provider port.
4. Caller cancellation is reported as the typed `cancelled` analysis failure, distinct from provider
   failure and timeout. Providers must honor the signal where their transport supports cancellation.
5. Caching, refresh controls, deduplication, and other workflow-specific resource policies remain
   product-owned. Add them only with a product-specific cache identity, bounded retention, privacy
   review, and an ADR.

## Alternatives and trade-offs

- Leaving the body parser unbounded would preserve maximum flexibility, but would make every future
  route responsible for remembering a transport-level resource limit.
- Encoding cancellation in the request schema would make lifecycle state part of a transport contract,
  but signals are not serializable and stale-request state should not cross the network.
- Treating cancellation as provider failure would simplify error mapping, but would hide expected
  caller behavior and make operational failures harder to distinguish from abandoned work.
- Adding a generic analysis cache now would reduce repeat provider calls, but would risk reusing
  sensitive page-derived results without a product-defined identity, TTL, or refresh policy.

## Consequences

The template supplies a safe default HTTP boundary and a reusable cancellation path for extension
workflows. Product routes remain responsible for input/output schemas, stage-specific limits, and
mapping the `cancelled` failure to their client behavior. Products that add retrieval, semantic
selection, or durable state must add their own security, privacy, retention, and cache decisions.
