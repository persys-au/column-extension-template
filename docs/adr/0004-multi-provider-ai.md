# ADR 0004: Product-Neutral Multi-Provider AI Boundary

- Status: accepted
- Date: 2026-08-24

## Context

Generated products need to select an AI vendor without coupling their application service to one
provider or copying provider-specific request formats into product code. Provider output is
untrusted data, and credentials must remain on the server. The template also needs a second real
implementation to make the abstraction testable rather than speculative.

## Decision

Keep the existing `AiProvider<TInput>` application port and add a server-side factory registry with
provider-neutral settings, structured-output descriptors, transport errors, and adapter hooks for
serialization and parsing. Include native-fetch OpenAI Chat Completions and Anthropic Messages
adapters. Products select a registered provider in their composition root and continue to validate
the resulting output with a product-owned Zod schema.

The template supports generic `AI_PROVIDER`, `AI_MODEL`, and `AI_API_KEY` fallback settings plus
provider-specific OpenAI and Anthropic settings. The server loads the ignored root `.env` file for
local development; deployments provide equivalent environment values through their secret store.

## Alternatives and trade-offs

- A single provider implementation would be smaller, but each generated product would need to
  replace the application boundary to change vendors.
- A provider SDK abstraction would reduce request-shape code, but native `fetch` keeps this template
  dependency-light and makes the HTTP contract explicit and easy to test.
- Product-specific prompts and schemas in the registry would offer a faster demo, but would make the
  reusable template depend on one product's domain.
- Automatic failover and load balancing are deferred because they require product-specific policy
  for retries, cost, latency, consistency, and partial failures.

## Consequences

Products get two tested provider implementations and one composition pattern without exposing
credentials to the extension. They must supply product prompts, schemas, API routes, and deployment
policy. Additional providers should implement the shared factory contract and add focused request,
response, and failure tests.
