```markdown
# Budget-Inquiry-System Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you how to effectively contribute to the **Budget-Inquiry-System**, a React application written in TypeScript. You'll learn the project's coding conventions, how to structure new features, and the typical workflows for developing, testing, and documenting modules within the codebase.

## Coding Conventions

### File Naming
- **PascalCase** is used for all file names, including components and modules.
  - Example: `BudgetInquiryForm.tsx`, `AppStore.ts`

### Import Style
- **Relative imports** are preferred for all modules.
  - Example:
    ```typescript
    import { BudgetItem } from '../domain/BudgetItem';
    import { useAppStore } from './useAppStore';
    ```

### Export Style
- **Named exports** are used throughout the codebase.
  - Example:
    ```typescript
    // src/domain/BudgetItem.ts
    export type BudgetItem = { ... };

    // src/ui/BudgetInquiryForm.tsx
    export function BudgetInquiryForm() { ... }
    ```

### Commit Patterns
- Commit messages are freeform, sometimes with prefixes.
- Average commit message length: ~27 characters.

## Workflows

### Feature Module Development
**Trigger:** When adding a new core feature or major system to the application.  
**Command:** `/new-feature-module`

1. **Create or update domain model files**
   - Add or modify TypeScript types, seed data, or business logic in `src/domain/*.ts`.
   - Example:
     ```typescript
     // src/domain/NewFeature.ts
     export type NewFeature = { id: string; name: string; };
     ```
2. **Update or add UI components and tabs**
   - Implement new React components in `src/ui/**/*.tsx`.
   - Example:
     ```typescript
     // src/ui/NewFeatureTab.tsx
     export function NewFeatureTab() { ... }
     ```
3. **Modify state management/store files**
   - Update `src/store/useAppStore.ts` to handle new state or actions.
   - Example:
     ```typescript
     // src/store/useAppStore.ts
     export function useAppStore() {
       // add new state or actions here
     }
     ```
4. **Update calculation or utility logic**
   - If needed, modify or add logic in `src/ui/useCalc.ts` or `src/engine/*.ts`.
5. **Add or update tests**
   - Write or update tests in `src/engine/*.test.ts` or relevant `*.test.ts` files.
   - Example:
     ```typescript
     // src/engine/NewFeature.test.ts
     import { calculateNewFeature } from './NewFeature';
     test('calculates correctly', () => { ... });
     ```
6. **Update styles and theme**
   - Modify `src/styles.css` to style new components or features.
7. **Update documentation**
   - If user-facing changes are made, update `README.md` to reflect them.

## Testing Patterns

- **Test file pattern:** `*.test.*` (e.g., `BudgetItem.test.ts`)
- **Testing framework:** Not explicitly specified; likely to use Jest or similar.
- **Test location:** Tests are placed alongside engine logic or relevant modules.
- **Example:**
  ```typescript
  // src/engine/BudgetCalculation.test.ts
  import { calculateBudget } from './BudgetCalculation';

  test('calculates budget correctly', () => {
    expect(calculateBudget([/*...*/])).toBe(/*...*/);
  });
  ```

## Commands

| Command             | Purpose                                      |
|---------------------|----------------------------------------------|
| /new-feature-module | Scaffold and guide new feature/module development |
```
