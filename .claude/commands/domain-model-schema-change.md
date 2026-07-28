---
name: domain-model-schema-change
description: Workflow command scaffold for domain-model-schema-change in Budget-Inquiry-System.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /domain-model-schema-change

Use this workflow when working on **domain-model-schema-change** in `Budget-Inquiry-System`.

## Goal

Update or extend the core domain data model (e.g., add new entities, fields, or structural changes).

## Common Files

- `src/domain/types.ts`
- `src/domain/seed.ts`
- `src/domain/systems.ts`
- `src/domain/bigSystems.ts`
- `src/store/useAppStore.ts`
- `src/engine/calc.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or create files in src/domain/ (e.g., types.ts, seed.ts, systems.ts, bigSystems.ts)
- Update any related calculation or validation logic in src/engine/
- Update UI components to reflect new/changed data (src/ui/...)
- Update store logic if state shape changes (src/store/useAppStore.ts)
- Add or update tests (src/engine/*.test.ts)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.