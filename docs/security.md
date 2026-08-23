# Security Defaults

This template provides conservative defaults for a browser extension with an optional server. A
generated product must review these rules against its actual permissions, data flows, and providers.

## Extension

- Manifest V3 extension pages use an explicit `script-src 'self'; object-src 'self';` content
  security policy.
- Do not add inline scripts, dynamic code evaluation, or unnecessary permissions.
- Values exposed through `VITE_` variables are public and may be bundled into the extension. Never put
  admin keys, server credentials, or other secrets in them.
- Treat captured page content as untrusted input. Bound and validate it before transport or storage.

## Server

- Parse runtime environment values with Zod at startup and fail clearly on invalid configuration.
- Do not fetch arbitrary user-supplied URLs from the server. If a product needs server-side fetching,
  define an allowlist and validate URL, scheme, redirects, response size, and timeout explicitly.
- Keep provider credentials and prompt construction on the server side.
- Do not log page content, credentials, or complete provider prompts by default.

## Repository

- Keep local `.env` files ignored and commit only `.env.example` placeholders.
- Review new permissions, endpoints, storage, dependencies, and data retention in the product
  definition and an ADR when the decision is non-trivial.
