# Contributing to MCP Content Credentials Server

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Prerequisites**
   - Node.js 18 or higher
   - npm or yarn
   - c2patool CLI tool installed

2. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd mcp-content-credentials
   npm install
   ```

3. **Build and Test**
   ```bash
   npm run build
   npm start
   ```

## Code Quality Standards

We maintain high code quality standards. All contributions must pass:

### 1. Type Safety
- Use TypeScript's strict mode (already configured)
- No implicit `any` types - be explicit
- Use type imports with `import type` for types-only imports
- Define interfaces for all public APIs

### 2. Linting
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

ESLint is configured with:
- TypeScript ESLint recommended rules
- Type-aware linting
- Prettier integration

### 3. Formatting
```bash
npm run format       # Format all files
npm run format:check # Check formatting without changing
```

Prettier configuration:
- Single quotes
- 2 space indentation
- 100 character line width
- Trailing commas (ES5)
- Semicolons required

### 4. Type Checking
```bash
npm run type-check  # Verify TypeScript types
```

### 5. Pre-commit Checks
Before committing, run:
```bash
npm run precommit
```

This runs lint, format check, and type check together.

## Architecture Guidelines

### Module Organization

Follow the layered architecture:

```
MCP Protocol Layer (index.ts)
       ↓
Service Layer (c2pa-service.ts)
       ↓
Utility Layer (file-utils, validators, logger)
       ↓
Type Layer (types.ts, constants.ts)
```

**Rules:**
- Higher layers can depend on lower layers
- Lower layers MUST NOT depend on higher layers
- Each layer has a specific responsibility

### Adding New Features

1. **Define Types First** (`types.ts`)
   ```typescript
   export interface NewFeatureParams {
     param1: string;
     param2: number;
   }
   ```

2. **Add Business Logic** (`c2pa-service.ts` or new service)
   ```typescript
   async newFeature(params: NewFeatureParams): Promise<Result> {
     // Validate inputs
     // Execute logic
     // Handle errors
     // Return structured result
   }
   ```

3. **Add MCP Tool** (`index.ts`)
   ```typescript
   // In ListToolsRequestSchema handler:
   {
     name: 'new_feature',
     description: '...',
     inputSchema: { /* ... */ }
   }
   
   // In CallToolRequestSchema handler:
   case 'new_feature': {
     // Call service method
     // Format result
   }
   ```

4. **Document** (README.md, JSDoc comments)

### Error Handling

Always use custom error types:

```typescript
// Define in types.ts
export class MyCustomError extends C2PAError {
  constructor(message: string, details?: unknown) {
    super(message, 'MY_CUSTOM_ERROR', details);
    this.name = 'MyCustomError';
    Object.setPrototypeOf(this, MyCustomError.prototype);
  }
}

// Use in service
throw new MyCustomError('Something went wrong', { context });

// Catch and return structured result
try {
  // ...
} catch (error) {
  logger.error('Operation failed', error, { context });
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}
```

### Logging

Use structured logging with context:

```typescript
import { createLogger } from './logger.js';

const logger = createLogger('module-name');

// Log with context
logger.info('Operation started', { userId, fileSize });
logger.error('Operation failed', error, { attemptNumber, timeElapsed });
```

**Guidelines:**
- Use appropriate log levels (debug, info, warn, error)
- Always provide context objects
- Log to stderr (already configured)
- Include timing info for performance-sensitive operations

### Testing (Future)

When tests are added:
- Write unit tests for pure business logic
- Write integration tests for service layer
- Mock external dependencies (file system, network, c2patool)
- Aim for >80% code coverage

## Code Review Checklist

Before submitting a PR, verify:

- [ ] Code follows TypeScript strict mode
- [ ] All functions have return type annotations
- [ ] Public APIs have JSDoc comments
- [ ] No console.log (use logger instead)
- [ ] Errors are handled with try/catch
- [ ] Custom error types used appropriately
- [ ] Input validation in place
- [ ] No hardcoded values (use constants.ts)
- [ ] Code is formatted (npm run format)
- [ ] Linter passes (npm run lint)
- [ ] Types check (npm run type-check)
- [ ] Builds successfully (npm run build)
- [ ] README updated if behavior changed
- [ ] No debugging code left in

## Commit Message Format

Use clear, descriptive commit messages:

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semi-colons, etc)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example:**
```
feat: add support for video file credentials

Add support for reading C2PA credentials from video files.
Updates c2patool execution to handle video formats.

Closes #123
```

## Questions or Issues?

- Open an issue for bugs or feature requests
- Ask questions in discussions
- Review existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

