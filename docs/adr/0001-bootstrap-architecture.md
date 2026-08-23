# ADR 0001: Browser-Extension Template Defaults

- Status: accepted for the bootstrap
- Date: 2026-08-23

## Context

This repository is intended to seed independent browser-extension products. The initial structure
must protect browser, server, and pure-domain boundaries without assuming what a particular product
will build. AI analysis is a known capability shared by the intended products, while concrete
analysis semantics and providers remain product-owned.

## Decisions

1. Use a pnpm workspace with private `core`, `extension`, and `server` packages as the internal
   structure of one generated product.
2. Keep browser capture explicit and user initiated when a product needs page content. Do not assume
   server-side fetching or automatic analysis.
3. Keep browser/server-safe contracts and pure processing in `core`.
4. Treat AI analysis as a core product capability. The default implementation uses a server-side
   application service and provider port to protect credentials and centralize orchestration,
   timeout handling, and output validation. The boundary remains replaceable if a product uses a
   different execution runtime.
5. Use structured, bounded representations rather than raw HTML at transport boundaries.
6. Use Zod at untrusted boundaries and derive types from schemas when contracts are implemented.
7. Prefer session state and avoid durable page history until a product explicitly requires it.
8. Include generic analysis request/result contracts, product-supplied schema validation, a
   server-side analysis service/provider boundary, timeout/error handling, and a deterministic fake
   provider. Leave prompts, model configuration, and concrete providers to generated products.

## Alternatives and trade-offs

- A server-side fetcher would simplify browser code, but would be less faithful for client-rendered
  pages and would introduce SSRF, cookie, paywall, and privacy concerns.
- Direct provider calls from the extension would remove a server hop, but would expose credentials
  or force user-managed keys and would scatter validation across browser code. A product may choose
  that model only with an explicit runtime decision and appropriate user-supplied credentials.
- Raw HTML would preserve more source detail, but it is harder to bound, safer to mishandle, and
  less useful for deterministic processing than normalized blocks.
- A larger package/plugin system could anticipate future inputs, but would add abstraction before
  a second implementation exists.

## Consequences

The first implementation can be tested with fixed fixtures and the included fake provider.
Product-specific analysis schemas, prompts, API contracts, and provider adapters can be added later
without changing the generic package boundaries. Removing the server requires an alternative runtime
for the core analysis capability.
