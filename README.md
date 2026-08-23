# Column Extension Template

This repository is a reusable starter architecture for TypeScript browser-extension products with AI
analysis and a default server-side execution boundary. It is a template for creating independent
product repositories, not a multi-product platform or a shared application monorepo.

Each product created from the template gets its own repository, implementation, release lifecycle,
and product decisions. The three packages are the internal structure of one generated product:

## Origin

Originally created by Mikhail Perepletchikov.

```text
packages/core       Browser/server-safe contracts, schemas, pure processing, and analysis types
packages/extension  Browser extension runtime and React side panel
packages/server     Default server-side API, analysis application, and provider concerns
```

## Current status

The repository contains project scaffolding only. The package boundaries, strict TypeScript setup,
Manifest V3 build, typed runtime/build-time configuration, security defaults, CI workflow, and
architecture documentation are ready. The server includes a deployment-ready health endpoint and a
generic analysis boundary; page capture, extraction, concrete analysis schemas/provider, product API
routes, and UI behavior must be implemented by the product repository created from this template.

## Requirements

- Node.js 22 or newer;
- pnpm 10.18.3;
- Chrome or another Chromium browser for loading the extension build.

The package manager and Node version are declared in [package.json](package.json) and [.nvmrc](.nvmrc).

## Setup

```bash
pnpm install
pnpm check
```

`pnpm check` runs formatting, linting, strict typechecking, tests, and package builds. The scaffold
includes focused configuration, analysis boundary, provider, and health endpoint tests.

Useful individual commands:

```bash
pnpm format         # Format files
pnpm format:check   # Check formatting
pnpm lint           # Run ESLint
pnpm typecheck      # Typecheck workspace packages
pnpm test           # Run Vitest
pnpm build          # Build workspace packages
```

Use pnpm for this workspace. The configured test script is `pnpm test`; there is no `test:run`
script.

## Create a product from this template

1. Enable **Template repository** in the GitHub repository's **Settings** page.
2. Choose **Use this template** and create a new product repository.
3. Clone the new repository and install dependencies with `pnpm install`.
4. Complete the bootstrap checklist below.

### Bootstrap checklist

- [ ] Rename the root package, extension manifest name/description, HTML title, and README.
- [ ] Fill in [docs/product.md](docs/product.md) with the product's problem, first workflow, data
      handling, and runtime needs.
- [ ] Copy [.env.example](.env.example) to `.env` and set only the local values the product needs.
- [ ] Keep credentials in the ignored `.env` file or the hosting provider's secret store; never put
      them in `VITE_` variables or extension code.
- [ ] Keep the default server runtime, or document an alternative analysis runtime before removing
      the server package and deployment adapter.
- [ ] Add product-owned analysis input/output schemas, prompt, model configuration, and provider
      adapter.
- [ ] Configure a public Flagsmith environment key only if the product uses remote feature flags.
- [ ] Implement the smallest product workflow and add product-specific contracts, tests, and ADRs.
- [ ] Run `pnpm check` before the first release.

The package names `core`, `extension`, and `server` are private workspace names and can remain
generic. Rename them only if the product needs a different internal convention; they are not
published libraries.

## Feature flags

The extension includes a neutral Flagsmith/OpenFeature provider boundary because generated products
may need this capability. Configure the public Flagsmith environment key in the local environment
when a product wires the provider into its entry point:

```env
VITE_FLAGSMITH_ENV_KEY=your_public_environment_key
```

The template does not define feature names, payload schemas, hooks, or product defaults. Add those
in the generated product and validate remote flag payloads with Zod. Without an environment key, the
provider uses an empty in-memory implementation for local development and tests. Initialize it from
the product's extension entry point with `configureFeatureFlags()`. Never bundle a Flagsmith admin or
server key.

## Extension build

Build the unpacked extension with:

```bash
pnpm build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select
`packages/extension/dist`. Update the manifest's name, description, permissions, and entry points
as the product implementation takes shape.

## Railway deployment

The root [railway.json](railway.json) provides a minimal single-service deployment path for the
default server package. Railway's Railpack builds the server workspace and starts it with the
package's `start` script. The configuration does not assume a database, Redis, persistent volume,
custom domain, or product-specific service name.

Create a Railway service from this repository and deploy it. Railway supplies the `PORT` environment
variable; the server listens on that port on `0.0.0.0`. The `/health` endpoint returns HTTP `200` with
`{"status":"ok"}` and is used by Railway's health check. Add product-specific environment variables
in Railway after the product adds the corresponding server behavior. The committed [.env.example](.env.example)
is for local development and documents the baseline variable expectations.

## Architecture rules

- Keep domain contracts and deterministic processing independent of Chrome APIs, React, Express,
  Node-only modules, and AI SDKs.
- Capture and clean page content locally where the browser has access to the rendered page.
- Never send raw DOM objects or unbounded raw HTML through extension messages or to a server.
- Perform deterministic cleanup, normalization, budgeting, and fingerprinting before semantic AI
  analysis.
- Keep provider credentials, prompt construction, and provider SDKs behind the default server-side
  application boundary. A different analysis runtime requires an explicit product decision.
- Validate untrusted JSON, environment values, messages, persisted state, and AI output at runtime
  with Zod.
- Keep the service worker responsible for extension job lifecycle and the side panel responsible
  for presentation.
- Prefer session-only page state and avoid durable history until a product requirement justifies it.
- Add an abstraction only when a second implementation or a clear test boundary makes it useful.

## Environment

The committed [.env.example](.env.example) is a neutral template for server/API and
extension build-time settings. The server configuration parses `NODE_ENV` and `PORT`; the extension
configuration parses `VITE_API_BASE_URL` and the public Flagsmith key. To create a local file:

```bash
cp .env.example .env
```

`.env` is ignored by Git and must never be committed. Provider-specific credentials should be added
only in the product repository when a concrete provider adapter exists, and must never enter
extension code.

## Documentation and CI

- [Contribution guidelines](CONTRIBUTING.md) explain the DCO sign-off and pull request expectations.
- [Architecture notes](docs/architecture.md) explain the package boundaries and first-slice rules.
- [Security defaults](docs/security.md) record extension, server, and repository safeguards.
- [Bootstrap ADR](docs/adr/0001-bootstrap-architecture.md) records the initial template decisions.
- [Feature flag ADR](docs/adr/0002-feature-flags.md) records the shared Flagsmith/OpenFeature
  boundary.
- [ADR template](docs/adr/000-template.md) provides the format for product decisions.
- [Product definition](docs/product.md) provides the product-specific planning starting point.
- [Development instruction set](docs/script.md) defines engineering standards.
- [CI workflow](.github/workflows/ci.yml) runs checks and builds on pushes and pull requests.

## Renaming this repository

The intended GitHub repository name is `column-extension-template`. Renaming the GitHub repository
does not require renaming the local folder, but a matching local folder can make the workspace less
confusing. After the GitHub rename, update the local remote if GitHub has not already redirected it:

```bash
git remote set-url origin git@github.com:persys-au/column-extension-template.git
```

The root package name matches the intended repository name. The internal package names remain
generic and private. The lockfile changes only when package names or dependency resolution changes;
build output should be regenerated with `pnpm build` and should not be committed.
