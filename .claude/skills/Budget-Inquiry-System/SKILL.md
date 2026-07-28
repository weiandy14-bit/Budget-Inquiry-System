```markdown
# Budget-Inquiry-System Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and coding conventions used in the **Budget-Inquiry-System** repository. The codebase is written in TypeScript and follows a set of clear, maintainable standards for file organization, code style, commit messages, and testing. By following these patterns, you'll be able to contribute effectively and maintain consistency throughout the project.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `budgetInquiryService.ts`, `userController.ts`

### Import Style
- Use **relative imports** for referencing other files or modules.
  - Example:
    ```typescript
    import { getBudget } from './budgetInquiryService';
    ```

### Export Style
- Use **named exports** for all modules and functions.
  - Example:
    ```typescript
    // budgetInquiryService.ts
    export function getBudget(userId: string): Budget { ... }
    ```

### Commit Messages
- Follow **conventional commit** style.
- Use the `feat` prefix for new features.
- Keep commit messages concise (average ~32 characters).
  - Example:
    ```
    feat: add budget summary endpoint
    ```

## Workflows

### Feature Development
**Trigger:** When implementing a new feature or module  
**Command:** `/feature-development`

1. Create a new TypeScript file using camelCase naming.
2. Write your code using named exports and relative imports.
3. Write corresponding tests in a `.test.ts` file.
4. Commit your changes using the `feat` prefix and a concise message.
   - Example: `feat: implement user budget retrieval`
5. Open a pull request for review.

### Testing
**Trigger:** When verifying code correctness  
**Command:** `/run-tests`

1. Write test files matching the pattern `*.test.*` (e.g., `budgetInquiryService.test.ts`).
2. Use the project's preferred (unknown) testing framework.
3. Run all tests to ensure code quality before committing.

## Testing Patterns

- Test files are named with the `*.test.*` pattern.
  - Example: `budgetInquiryService.test.ts`
- Place tests alongside or near the code they test.
- Use the project's (unspecified) testing framework to write and run tests.
- Ensure all new features and bug fixes are covered by appropriate tests.

## Commands
| Command             | Purpose                                         |
|---------------------|-------------------------------------------------|
| /feature-development| Start a new feature following repo conventions  |
| /run-tests          | Run all tests in the codebase                   |
```
