# ADR 0002: Flagsmith Through OpenFeature

- Status: accepted for generated products
- Date: 2026-08-23

## Context

Products created from this repository may use remote feature flags for controlled rollout or
operational switches. The integration should be available in the extension without forcing the
template to know any product flag names or payload shapes.

## Decision

Use the Flagsmith OpenFeature provider in the extension package. Read only the public Flagsmith
environment key from build-time configuration and expose a small provider factory. When the key is
missing, use an empty in-memory provider so tests and local setup do not depend on the network.

Each generated product owns its flag keys, Zod schemas, evaluation context, hooks, and defaults. The
template does not define a sample flag or silently enable product behavior.

## Alternatives and trade-offs

- Calling the Flagsmith SDK directly from every product would couple feature consumers to a vendor
  API and repeat initialization logic.
- A custom flag service abstraction would add another vocabulary without a second implementation.
- Server-side flag evaluation would protect more configuration, but extension-only rollout switches
  would require an unnecessary network hop and server dependency.
- An in-memory fallback keeps tests deterministic, but it must not be mistaken for remote flag
  evaluation or production configuration.

## Consequences

Generated extensions that use remote flags share provider setup and can use standard OpenFeature APIs.
Product behavior remains local to each product, and missing configuration fails closed to no remote
flags. A product initializes the provider from its extension entry point and supplies a public
environment key when remote evaluation is required.
