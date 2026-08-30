# ADR 0003: Multi-Browser Extension Packaging

## Status

Accepted

## Context

The template initially described and built a Chromium-only Manifest V3 extension. Chrome and Edge
share the Chromium extension model, while Firefox uses the same general WebExtensions APIs with
different manifest keys for background execution and sidebars. Product repositories should be able
to support these browser families without duplicating product logic or placing browser-specific
assumptions in core contracts.

## Decision

Keep one `extension` package and isolate browser API differences in
`packages/extension/src/platform`. Use `webextension-polyfill` for the common promise-based API
surface and expose a small template-owned platform contract for tabs, messages, events, actions,
scripting, and panel opening.

Emit separate unpacked builds:

- `dist/chrome`, using the Chromium manifest, for Chrome and Edge;
- `dist/firefox`, using the Firefox manifest with `background.scripts` and `sidebar_action`.

The Chromium adapter opens `sidePanel`; the Firefox adapter opens `sidebarAction`. Shared product
code remains independent of the selected target. Safari is deferred because its WebExtension
packaging and host integration need a separate distribution decision.

The Firefox manifest includes a placeholder extension ID and a `none` data collection declaration.
A generated product must replace both with product-owned values that match its actual Firefox
publishing and data-handling requirements.

## Alternatives considered

- Keep direct `chrome.*` calls and maintain a second Firefox implementation. This duplicates
  product logic and spreads API differences across runtime entry points.
- Use only `browser.*` without an adapter. This simplifies common call sites but leaves Chromium-only
  APIs such as `sidePanel` outside the common surface and makes panel behavior implicit.
- Create separate extension packages. This provides maximum packaging independence but duplicates
  the shared UI and runtime while the browser implementations remain substantially similar.

## Consequences

The common runtime is easier to test without a browser, and future browser differences have one
obvious ownership boundary. Builds take longer because shared bundles are emitted for each target.
A product that adds another browser must add its manifest, build target, adapter behavior, tests, and
publishing metadata rather than assuming Chromium compatibility.
