```markdown
# Budget-Inquiry-System Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the **Budget-Inquiry-System** repository. The project is written in TypeScript and organizes business logic, domain models, and UI components without a specific framework. You'll learn how to structure code, follow naming conventions, manage domain models, and propagate changes throughout the codebase, ensuring consistency and maintainability.

## Coding Conventions

### File Naming
- **PascalCase** is used for file names.
  - Example: `MainApp.tsx`, `BigSystems.ts`, `Seed.ts`

### Import Style
- **Relative imports** are used throughout the codebase.
  - Example:
    ```typescript
    import { System } from '../domain/systems';
    ```

### Export Style
- **Named exports** are preferred.
  - Example:
    ```typescript
    // In domain/types.ts
    export type System = { ... };
    ```

### Commit Patterns
- Commit messages are freeform, sometimes with prefixes.
- Average commit message length: 24 characters.

## Workflows

### Add or Refactor Domain Model
**Trigger:** When introducing a new domain concept (e.g., a new system layer) or significantly refactoring an existing one.
**Command:** `/new-domain-model`

1. **Create or modify domain model file(s)**
   - Example: `src/domain/bigSystems.ts`, `src/domain/systems.ts`
   - ```typescript
     // src/domain/bigSystems.ts
     export type BigSystem = { id: string; name: string; };
     export const bigSystems: BigSystem[] = [ ... ];
     ```
2. **Update type definitions**
   - Example: `src/domain/types.ts`
   - ```typescript
     export type System = { id: string; name: string; };
     ```
3. **Update seed data**
   - Example: `src/domain/seed.ts`
   - ```typescript
     import { bigSystems } from './bigSystems';
     export const seedData = { bigSystems };
     ```
4. **Update store logic/state**
   - Example: `src/store/useAppStore.ts`
   - ```typescript
     import { bigSystems } from '../domain/bigSystems';
     export const useAppStore = () => { /* logic using bigSystems */ };
     ```
5. **Update UI components and logic**
   - Examples: `src/ui/MainApp.tsx`, `src/ui/tabs/OverviewTab.tsx`, `src/ui/tabs/SystemDetailTab.tsx`, `src/ui/useCalc.ts`
   - ```typescript
     // src/ui/MainApp.tsx
     import { bigSystems } from '../domain/bigSystems';
     ```
6. **Update or add tests if business logic is affected**
   - Example: `src/engine/checks.test.ts`
   - ```typescript
     import { checkSystem } from './checks';
     test('should validate new system', () => { ... });
     ```

## Testing Patterns

- **Test Framework:** Unknown (not detected), but test files follow the `*.test.*` pattern.
- **Test File Example:** `engine/checks.test.ts`
- **Test Structure Example:**
  ```typescript
  import { checkSystem } from './checks';

  test('should validate system', () => {
    // Arrange
    // Act
    // Assert
  });
  ```

## Commands

| Command            | Purpose                                                          |
|--------------------|------------------------------------------------------------------|
| /new-domain-model  | Add or refactor a core domain model and propagate related changes |
```
