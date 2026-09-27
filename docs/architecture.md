# Template Architecture

Status: bootstrap documentation. The extension emits Chrome/Edge and Firefox targets through a
shared browser platform boundary. The server exposes a deployment health endpoint, a bounded HTTP
boundary, a cancellable generic analysis boundary, and a product-neutral multi-provider adapter
registry; concrete product analysis behavior is intentionally not implemented yet.

## Purpose

This repository is a reusable starting point for one TypeScript browser-extension product. It is
not a platform containing multiple products. A generated product may keep these packages in one
workspace while maintaining its own implementation and release lifecycle.

## Package boundaries

```text
packages/core       Browser/server-safe contracts, schemas, pure processing, and analysis types
packages/extension  Browser extension runtime and React side panel
packages/server     Default server-side API, analysis application, and provider concerns
```

Dependencies point inward. Core must remain independent of Chrome APIs, React, Express, Node-only
modules, and AI SDKs. Adapters and entry points may depend on core, but raw DOM and provider
credentials must stay inside their owning runtime boundaries.

Product-specific domain models and use cases belong in the generated product and should not be
pushed into generic template abstractions prematurely.

## Browser platform boundary

The extension keeps one product package and isolates browser differences in
`packages/extension/src/platform`. The platform adapter exposes the promise-based tabs, runtime,
action, scripting, and panel capabilities used by extension entry points. Product code should use
that contract rather than calling `chrome.*` or `browser.*` directly.

`webextension-polyfill` normalizes the shared WebExtensions API surface. Chromium panel access is
bound to `sidePanel.open`, while Firefox panel access is bound to `sidebarAction.open`; the selected
implementation is the only browser-specific panel decision in the runtime code.

The build emits two unpacked targets: `dist/chrome` uses the Chromium manifest and is shared by
Chrome and Edge, while `dist/firefox` uses a Firefox manifest with `background.scripts` and
`sidebar_action`. Safari remains deferred because its WebExtension packaging and host integration
need a separate distribution decision.

## First-slice direction

The first implementation for a generated product should prove one narrow workflow before adding
broader abstractions:

- explicit user action starts work in the extension;
- browser-specific code captures only the rendered data it needs;
- pure code cleans, normalizes, bounds, and fingerprints that data;
- an application service coordinates analysis through a provider port;
- the HTTP boundary accepts only strict, bounded JSON and reports malformed or oversized requests
  explicitly;
- caller cancellation propagates through the application service to provider work, alongside the
  service-owned timeout;
- runtime validation protects every untrusted boundary;
- the side panel renders structured state and results.

The exact page model, analysis input/output semantics, prompt, and provider selection are product
decisions. The template supplies common adapters but does not create product semantics
speculatively.

## AI analysis boundary

AI analysis is a core capability of products created from this template. The default architecture
performs analysis through the server package, which protects provider credentials and centralizes
orchestration, timeout handling, and output validation. The boundary remains runtime-independent so
a product may replace or remove the server only when another runtime supplies the same analysis
capability.

The core package provides generic `AnalysisRequest<TInput>` and `AnalysisResult<TOutput>` contracts,
plus schema factories for product-owned input and output schemas. The server package provides
`AnalysisService<TInput, TOutput>`, the vendor-neutral `AiProvider<TInput>` port, a deterministic fake
provider, a provider factory registry, and native-fetch OpenAI and Anthropic adapters. Products
supply the concrete schemas, prompt, input serializer, output parser or schema validation, and
analysis API wiring. The built-in adapters only translate the shared request contract into each
provider's API shape; they do not contain product prompts or domain models.

`AnalysisService` accepts a caller-owned `AbortSignal` outside the serialized request contract. It
composes that signal with the service timeout, aborts provider work when either limit is reached, and
reports caller cancellation separately from provider failure. It can also forward an optional
content-free usage diagnostics sink to providers; adapters may report request size, latency, and
vendor-supplied token counts without logging prompts, responses, or page content. The included JSONL
sink is best effort and opt-in. The Express composition root installs a strict JSON parser with a
configurable 1 MB default limit before product routes are added; product routes still own their
specific schemas and response contracts.

## Important concepts

- Deterministic cleanup and preprocessing happen before semantic analysis.
- Browser-specific APIs stay behind the extension platform boundary, while target-specific manifest
  wiring stays in the build script.
- Raw DOM objects and unbounded raw HTML do not cross extension-message or server boundaries.
- AI output is data and must be validated before presentation.
- The application service owns analysis orchestration; provider adapters own vendor request and
  response details.
- HTTP bodies are strictly parsed and bounded before route-level schema validation; request limits
  are transport safeguards, not substitutes for product input schemas.
- Cancellation is an out-of-band lifecycle concern. It is propagated through `AbortSignal` and is
  never serialized into browser/server contracts or logged as page content.
- The service worker owns job lifecycle and stale-request protection; the side panel owns display
  state.
- Session state is ephemeral by default. Durable history needs an explicit product decision.
- Zod is the default runtime validation library for untrusted JSON, environment values, messages,
  persisted snapshots, and AI output.
- AI analysis is a core capability; the default server runtime owns provider invocation and output
  validation, while the contracts remain independent of that runtime.
- AI usage diagnostics are optional operational metadata; sinks must remain content-free and must
  not make an analysis request fail when diagnostics persistence is unavailable.
- Server runtime and extension build-time configuration are parsed at their respective boundaries;
  there is no universal configuration object shared across runtimes.
- The template supports Flagsmith through OpenFeature for remote feature flags. Flag names, payload
  schemas, and product defaults belong to the generated product, not this template.
- Security defaults are documented in [security.md](security.md), including extension CSP, secret
  separation, and restrictions on server-side URL fetching.
- The provider registry has separate OpenAI and Anthropic implementations; additional adapters need
  a real product requirement and a focused contract test.

## Feature flags

The extension package includes a small Flagsmith/OpenFeature provider boundary. A product entry point
can call `configureFeatureFlags()`; it reads the public `VITE_FLAGSMITH_ENV_KEY` build-time value,
uses Flagsmith when configured, and falls back to an empty in-memory provider when no key is
available. This fallback is for local development and tests; it does not define any flags or silently
invent product behavior.

Products should initialize the provider from their extension entry point and define their own flag
keys, Zod schemas, hooks, defaults, and evaluation context. Flagsmith environment keys may be bundled
into browser code; Flagsmith admin or server credentials must never be bundled.

## Deployment baseline

The repository includes a minimal Railway adapter for the default server package. It builds the
server workspace, starts the compiled entry point, probes `/health`, and restarts on failure. Railway
provides the runtime `PORT`; the server binds to `0.0.0.0`. A product may replace or remove this
deployment only when it supplies another analysis runtime. Product repositories own any databases,
queues, volumes, scaling, domains, secrets, and additional services.

## Deliberately deferred

The bootstrap does not assume site-specific adapters, retrieval, embeddings, accounts, billing,
durable history, product-specific feature flags and flag-driven behavior, provider failover or
load-balancing policy, a database, automatic analysis, process-local analysis caching or refresh
semantics, or a generalized plugin system. Add them only when a product requirement and an ADR
justify them.

## Tooling

- Node.js 22 and pnpm 10;
- strict TypeScript with package-local typechecks;
- Zod for runtime schemas;
- Vitest for deterministic tests;
- ESLint 9 and Prettier 3 for quality checks;
- React and Vite for the side panel;
- esbuild for content-script and service-worker bundles;
- webextension-polyfill for the shared browser API surface;
- OpenFeature and Flagsmith for extension feature flags;
- Express for an optional analysis API.
