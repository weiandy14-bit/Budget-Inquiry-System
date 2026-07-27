---
name: feature-module-development
description: Workflow command scaffold for feature-module-development in Budget-Inquiry-System.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-module-development

Use this workflow when working on **feature-module-development** in `Budget-Inquiry-System`.

## Goal

Implements a new major feature or refactors a core domain module, updating related UI, domain logic, state management, and calculations. Frequently includes new or updated domain files, UI tabs, store logic, and calculation utilities.

## Common Files

- `src/domain/*.ts`
- `src/ui/tabs/*.tsx`
- `src/ui/MainApp.tsx`
- `src/store/useAppStore.ts`
- `src/ui/useCalc.ts`
- `src/engine/checks.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update domain model files (e.g., domain/systems.ts, domain/bigSystems.ts, domain/types.ts, domain/seed.ts)
- Update or add UI components or tabs (e.g., src/ui/tabs/*.tsx, src/ui/MainApp.tsx)
- Update store logic and state (src/store/useAppStore.ts)
- Update calculation or utility files (src/ui/useCalc.ts, src/engine/checks.ts)
- Update styles if needed (src/styles.css)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.