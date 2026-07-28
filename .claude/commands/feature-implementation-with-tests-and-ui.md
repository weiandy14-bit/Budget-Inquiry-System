---
name: feature-implementation-with-tests-and-ui
description: Workflow command scaffold for feature-implementation-with-tests-and-ui in Budget-Inquiry-System.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-implementation-with-tests-and-ui

Use this workflow when working on **feature-implementation-with-tests-and-ui** in `Budget-Inquiry-System`.

## Goal

Implement a new feature or major enhancement, including UI, logic, and tests.

## Common Files

- `src/ui/MainApp.tsx`
- `src/ui/tabs/*.tsx`
- `src/domain/types.ts`
- `src/domain/seed.ts`
- `src/engine/calc.ts`
- `src/engine/checks.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Implement or update UI components (src/ui/...)
- Update or add domain/model logic (src/domain/...)
- Update calculation/validation logic if needed (src/engine/...)
- Update store/state management if needed (src/store/useAppStore.ts)
- Add or update tests (src/engine/*.test.ts)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.