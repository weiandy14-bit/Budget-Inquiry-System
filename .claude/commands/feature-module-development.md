---
name: feature-module-development
description: Workflow command scaffold for feature-module-development in Budget-Inquiry-System.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-module-development

Use this workflow when working on **feature-module-development** in `Budget-Inquiry-System`.

## Goal

Implements a new major feature or module, including UI, domain logic, state management, and tests.

## Common Files

- `src/domain/*.ts`
- `src/store/useAppStore.ts`
- `src/ui/**/*.tsx`
- `src/ui/useCalc.ts`
- `src/engine/*.ts`
- `src/engine/*.test.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update domain model files (e.g., types, seed data, logic).
- Update or add UI components and tabs to reflect the new feature.
- Modify state management/store files to support the new feature.
- Update calculation or utility logic if necessary.
- Add or update tests for the new logic.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.