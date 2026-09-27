# ADR 0006: Content-Free AI Usage Diagnostics

- Status: accepted
- Date: 2026-09-27

## Context

Provider cost, latency, and token behavior are difficult to reason about without request-level
measurements. The Argulens sibling records these metrics in an append-only JSONL file while keeping
prompts, model responses, and discussion content out of operational logs. The template needs the
same observability seam without assuming a product's storage, route, or input model.

## Decision

1. `AnalysisService` may receive an optional `AiUsageDiagnosticsSink` and forwards it through the
   runtime-only provider context. It is not part of the serialized `AnalysisRequest` contract.
2. Built-in OpenAI and Anthropic adapters emit provider ID, model, request byte count, duration, and
   available token metadata. Missing vendor usage fields remain absent or optional rather than being
   fabricated.
3. `createAiUsageLogSink` provides an opt-in append-only JSONL implementation. It creates parent
   directories and swallows filesystem failures so diagnostics cannot fail an otherwise successful
   analysis.
4. Products choose whether to configure a sink, where records are stored, and how retention or
   export is handled. The template does not enable a universal log path or persist content by
   default.

## Alternatives and trade-offs

- Logging prompts and model responses would make debugging easier, but would increase privacy,
  retention, and secret-handling risk.
- Making diagnostics mandatory would improve coverage, but would couple every product to one
  storage and operational policy.
- Provider-specific logging in each product would avoid a shared hook, but would duplicate
  instrumentation and make cross-provider comparisons inconsistent.

## Consequences

Generated products can measure provider spend and latency with a small, vendor-neutral hook. The
diagnostics are intentionally incomplete when a provider does not return usage metadata, and the
JSONL sink is suitable for local or single-instance deployments; hosted products need their own
retention and aggregation decision.
