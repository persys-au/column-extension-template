# Development Instruction Set

Use this file as the default engineering standard for this repository.

## 1. Architecture and Code Quality Principles

- Single Responsibility Principle (SRP): Create small, focused functions and classes.
- DRY Principle (Don't Repeat Yourself): Avoid duplicated business logic; reuse existing helpers or centralize logic.
- Separation of Concerns: Keep persistence, business rules, API/transport, and UI logic separated.
- Codebase Consistency: Follow existing naming, file structure, and architectural patterns.
- Preserve the package boundaries and security rules documented in `docs/architecture.md` and
  `docs/security.md`.
- Type Safety: Use TypeScript types/interfaces to reduce runtime errors.
- Explicit Error Handling: Prefer explicit checks and actionable errors over silent fallbacks.
- No Speculative Changes: Implement only what is required now; avoid premature abstractions.
- Incrementalism: Break complex changes into verifiable steps.
- Self-Documenting Code: Favor intent-revealing names; use comments sparingly for non-obvious rationale.

## 2. Testing and Validation Standards

- Add unit tests for every newly created TypeScript module that contains runtime behavior.
- Use companion test files colocated with source where possible (for example, `module.ts` and `module.test.ts`).
- Cover happy path, edge cases, and explicit failure/error paths.
- Keep tests deterministic (stable fixtures, explicit timestamps/order where needed).
- Run relevant package tests after changes; if shared contracts change, run workspace-level tests.

## 3. Documentation and Decision Records

- Document assumptions and implementation strategy in dedicated markdown under `docs/` when behavior changes are non-trivial.
- For significant design choices, capture:
  - decision,
  - alternatives considered,
  - why the selected approach was chosen,
  - known trade-offs/risks.

## 4. Refactoring Guidance

- Refactor structural issues only when directly related to the requested change.
- Preserve behavior unless intentional change is requested and documented.
- Protect refactors with tests before and after behavior-sensitive edits.

## 5. Comments and Public API Documentation

- Add source comments only when they explain the "why" and not the obvious "what".
- Add TSDoc to exported APIs when their contract is not obvious, including:
  - parameters,
  - return values,
  - thrown errors when applicable.

## 6. Definition of Done

- Required tests are added/updated and passing.
- Edge cases relevant to the change were reviewed.
- Documentation is updated when logic/contracts/behavior changed.
- No avoidable lint/type/test regressions are introduced.
