```markdown
# Budget-Inquiry-System Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you how to contribute to the **Budget-Inquiry-System**, a React-based TypeScript application for managing and analyzing budgets. You'll learn the project's coding conventions, how to develop new features or modules, and how to maintain consistency in code style, file organization, and testing.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `useCalc.ts`, `mainApp.tsx`, `bigSystems.ts`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```typescript
    import { calculateBudget } from '../engine/checks';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In src/engine/checks.ts
    export function calculateBudget(...) { ... }
    ```

### Commit Patterns
- Commit messages are freeform, often with a short prefix.
- Average commit message length: ~30 characters.
  - Example: `Add new tab for system overview`

## Workflows

### Feature Module Development
**Trigger:** When you want to add or significantly change a core feature/module (e.g., systems, big systems, tabs).
**Command:** `/new-feature-module`

1. **Create or update domain model files**
   - Edit or add files in `src/domain/` such as `systems.ts`, `bigSystems.ts`, `types.ts`, or `seed.ts`.
   - Example:
     ```typescript
     // src/domain/systems.ts
     export interface System { ... }
     export const systems: System[] = [ ... ];
     ```
2. **Update or add UI components or tabs**
   - Modify or create files in `src/ui/tabs/` or update `src/ui/MainApp.tsx`.
   - Example:
     ```tsx
     // src/ui/tabs/NewFeatureTab.tsx
     export function NewFeatureTab() { ... }
     ```
3. **Update store logic and state**
   - Edit `src/store/useAppStore.ts` to add new state or actions.
   - Example:
     ```typescript
     // src/store/useAppStore.ts
     export const useAppStore = create((set) => ({
       newFeature: [],
       addNewFeature: (item) => set((state) => ({ newFeature: [...state.newFeature, item] })),
     }));
     ```
4. **Update calculation or utility files**
   - Edit `src/ui/useCalc.ts`, `src/engine/checks.ts`, or similar files.
   - Example:
     ```typescript
     // src/engine/checks.ts
     export function checkNewFeature(...) { ... }
     ```
5. **Update styles if needed**
   - Edit `src/styles.css` to style new or updated components.
6. **Update or add related tests**
   - Add or update test files, typically named `*.test.ts` (e.g., `src/engine/checks.test.ts`).
   - Example:
     ```typescript
     // src/engine/checks.test.ts
     import { checkNewFeature } from './checks';
     test('should validate new feature', () => { ... });
     ```
7. **Update documentation if necessary**
   - Edit `README.md` to document new features or changes.

## Testing Patterns

- **Testing Framework:** Not explicitly specified; test files follow the `*.test.*` pattern, suggesting use of common JS/TS test frameworks (e.g., Jest).
- **Test File Placement:** Tests are placed alongside implementation files, e.g., `src/engine/checks.test.ts`.
- **Test Example:**
  ```typescript
  // src/engine/checks.test.ts
  import { checkBudget } from './checks';

  test('calculates budget correctly', () => {
    expect(checkBudget(...)).toBe(...);
  });
  ```

## Commands

| Command             | Purpose                                                  |
|---------------------|----------------------------------------------------------|
| /new-feature-module | Start the feature/module development workflow            |
```
