---
name: add-or-update-tests
description: Workflow command scaffold for add-or-update-tests in Budget-Inquiry-System.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-tests

Use this workflow when working on **add-or-update-tests** in `Budget-Inquiry-System`.

## Goal

Add or update automated tests (unit or e2e) for new or existing features.

## Common Files

- `src/engine/calc.test.ts`
- `src/engine/checks.test.ts`
- `e2e/app.spec.ts`
- `package.json`
- `playwright.config.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Write or update unit tests (src/engine/*.test.ts)
- Write or update e2e tests (e2e/*.ts)
- Update test scripts/configuration (package.json, playwright.config.ts)
- Ensure all tests pass

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.