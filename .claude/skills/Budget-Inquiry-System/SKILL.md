```markdown
# Budget-Inquiry-System Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill describes the core development patterns and workflows for the **Budget-Inquiry-System** repository, a TypeScript React application for managing and inquiring about budget systems. It covers coding conventions, domain-driven workflows, feature implementation, and testing strategies, enabling consistent and efficient contributions to the codebase.

## Coding Conventions

- **File Naming:**  
  Use `camelCase` for file and folder names.
  - Example: `useAppStore.ts`, `bigSystems.ts`

- **Import Style:**  
  Use **relative imports** within the `src/` directory.
  ```typescript
  import { calculateBudget } from '../engine/calc';
  import { SystemDetailTab } from './tabs/SystemDetailTab';
  ```

- **Export Style:**  
  Use **named exports** for all modules.
  ```typescript
  // src/engine/calc.ts
  export function calculateBudget(...) { ... }
  ```

- **Commit Messages:**  
  - Use the `feat` prefix for new features.
  - Messages are freeform, average length ~30 characters.
  - Example:  
    ```
    feat: add support for multi-year budgets
    ```

## Workflows

### Domain Model Schema Change
**Trigger:** When you need to add or modify a core data structure or business entity  
**Command:** `/update-domain-model`

1. Edit or create files in `src/domain/` (e.g., `types.ts`, `seed.ts`, `systems.ts`, `bigSystems.ts`).
2. Update related calculation or validation logic in `src/engine/` as needed.
3. Update UI components to reflect new/changed data (e.g., `src/ui/tabs/SystemDetailTab.tsx`, `src/ui/tabs/OverviewTab.tsx`).
4. Update store logic if the state shape changes (`src/store/useAppStore.ts`).
5. Add or update tests in `src/engine/*.test.ts`.
6. Ensure all tests pass.

**Example:**  
_Adding a new field to a domain type:_
```typescript
// src/domain/types.ts
export type System = {
  id: string;
  name: string;
  // New field
  budgetYear: number;
};
```
_Update calculation logic:_
```typescript
// src/engine/calc.ts
export function calculateBudget(system: System) {
  // Use system.budgetYear in calculations
}
```

### Feature Implementation with Tests and UI
**Trigger:** When you want to add a new user-facing feature or significant workflow  
**Command:** `/add-feature`

1. Implement or update UI components in `src/ui/` (e.g., `MainApp.tsx`, `tabs/*.tsx`).
2. Update or add domain/model logic in `src/domain/`.
3. Update calculation/validation logic if needed in `src/engine/`.
4. Update store/state management if needed (`src/store/useAppStore.ts`).
5. Add or update tests (`src/engine/*.test.ts`).
6. Update documentation if needed (`README.md`).
7. Ensure all tests pass.

**Example:**  
_Adding a new tab:_
```typescript
// src/ui/tabs/BudgetSummaryTab.tsx
export function BudgetSummaryTab() {
  // Tab implementation
}
```
_Unit test:_
```typescript
// src/engine/calc.test.ts
import { calculateBudget } from './calc';

test('calculates budget for new system', () => {
  // Test logic
});
```

### Add or Update Tests
**Trigger:** When you add a new feature, change logic, or want to increase test coverage  
**Command:** `/add-tests`

1. Write or update unit tests in `src/engine/*.test.ts`.
2. Write or update e2e tests in `e2e/*.ts`.
3. Update test scripts/configuration (`package.json`, `playwright.config.ts`).
4. Ensure all tests pass.

**Example:**  
_Unit test:_
```typescript
// src/engine/checks.test.ts
import { validateSystem } from './checks';

test('validates system with new field', () => {
  // Test logic
});
```
_E2E test:_
```typescript
// e2e/app.spec.ts
import { test, expect } from '@playwright/test';

test('user can view system details', async ({ page }) => {
  await page.goto('/');
  // Test steps
});
```

## Testing Patterns

- **Framework:** [Playwright](https://playwright.dev/)
- **Unit Tests:**  
  - Located in `src/engine/*.test.ts`
  - Use `.test.ts` suffix
  - Example:
    ```typescript
    // src/engine/calc.test.ts
    import { calculateBudget } from './calc';

    test('calculates correct total', () => {
      expect(calculateBudget({ ... })).toBe(1000);
    });
    ```
- **E2E Tests:**  
  - Located in `e2e/*.ts`
  - Example:
    ```typescript
    // e2e/app.spec.ts
    test('loads main app', async ({ page }) => {
      await page.goto('/');
      expect(await page.textContent('h1')).toContain('Budget Inquiry');
    });
    ```
- **Test Configuration:**  
  - Controlled via `package.json` and `playwright.config.ts`
- **Run All Tests:**  
  ```
  npm test
  ```

## Commands

| Command               | Purpose                                                      |
|-----------------------|--------------------------------------------------------------|
| /update-domain-model  | Update or extend the core domain data model                  |
| /add-feature          | Implement a new feature or major enhancement                 |
| /add-tests            | Add or update automated tests (unit or e2e)                  |
```
