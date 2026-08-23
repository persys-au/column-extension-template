# Copilot Instructions for This Repository

Follow the canonical engineering instruction set in docs/script.md.

## Required defaults

- Use high-quality, maintainable architecture and keep changes incremental.
- Add unit tests for every newly created TypeScript module that contains runtime behavior.
- Keep logic DRY and aligned with existing repository patterns.
- Prefer explicit error handling over silent fallbacks.
- Document non-trivial assumptions and implementation strategy in docs markdown files.
- Refactor structural issues only when directly related to the requested change; protect behavior
  changes with tests.
- Add comments only for non-obvious rationale (the "why").
- Add TSDoc to exported APIs when their contract is not obvious; include `@param`, `@returns`, and
  `@throws` where applicable.
- Preserve the package boundaries and security rules in `docs/architecture.md` and `docs/security.md`.

## Verification expectations

- Validate with relevant package tests.
- If contracts or shared behavior change, run broader workspace tests.
- Avoid introducing avoidable lint/type/test regressions.
