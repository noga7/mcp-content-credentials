# Architecture Documentation

## Overview

The MCP Content Credentials Server is designed with clean architecture principles, emphasizing separation of concerns, type safety, and maintainability.

## Design Philosophy

### Core Principles

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Type Safety**: Strong TypeScript typing throughout with no implicit `any`
3. **Dependency Flow**: Dependencies flow downward (protocol → service → utilities)
4. **Error Handling**: Explicit error handling with custom error types
5. **Testability**: Pure functions and dependency injection enable easy testing
6. **Logging**: Structured logging for debugging without protocol interference

## Layered Architecture

```
┌─────────────────────────────────────────┐
│   MCP Protocol Layer (index.ts)         │
│   - Request handlers                     │
│   - Tool definitions                     │
│   - Response formatting                  │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│   Service Layer (c2pa-service.ts)       │
│   - Business logic                       │
│   - Orchestration                        │
│   - Result formatting                    │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│   Utility Layer                          │
│   - file-utils.ts (file operations)     │
│   - validators.ts (input validation)    │
│   - logger.ts (structured logging)      │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│   Foundation Layer                       │
│   - types.ts (interfaces, errors)       │
│   - constants.ts (configuration)        │
└─────────────────────────────────────────┘
```

## Module Details

### MCP Protocol Layer (`index.ts`)

**Responsibility**: Handle MCP protocol communication

**Key Functions:**
- Define available tools and schemas
- Parse incoming requests
- Route to appropriate service methods
- Format responses for MCP protocol
- Handle graceful shutdown

**Design Notes:**
- Minimal business logic
- Focuses on protocol concerns
- Uses stdio transport
- Logs to stderr to avoid protocol conflicts

**Dependencies:**
- `@modelcontextprotocol/sdk`
- `c2pa-service`
- `logger`
- `types`

### Service Layer (`c2pa-service.ts`)

**Responsibility**: Core business logic for C2PA operations

**Key Functions:**
- Execute c2patool commands
- Parse c2patool output
- Read credentials from files
- Read credentials from URLs
- Handle errors gracefully

**Design Notes:**
- Stateless class (can be instantiated independently)
- All methods are async
- Returns structured `C2PAResult`
- Comprehensive error handling
- Delegates file operations to utilities

**Key Methods:**

```typescript
class C2PAService {
  // Read credentials from local file
  async readCredentialsFromFile(filePath: string): Promise<C2PAResult>
  
  // Read credentials from URL (downloads temporarily)
  async readCredentialsFromUrl(url: string): Promise<C2PAResult>
  
  // Execute c2patool (private)
  private async executeC2PATool(filePath: string): Promise<{stdout, stderr}>
  
  // Parse c2patool output (private)
  private parseC2PAOutput(stdout: string, stderr: string): C2PAResult
  
  // Check if output indicates no credentials (private)
  private hasNoCredentials(output: string): boolean
}
```

### Utility Layer

#### File Utils (`file-utils.ts`)

**Responsibility**: File system operations

**Key Functions:**
- Check if file exists
- Ensure file exists (throws if not)
- Download file from URL
- Generate temporary file names
- Safe file deletion

**Design Notes:**
- All functions are async
- Proper cleanup in finally blocks
- Timeout handling for downloads
- Structured error types

#### Validators (`validators.ts`)

**Responsibility**: Input validation

**Key Functions:**
- Validate non-empty strings
- Validate URLs (protocol, format)
- Validate file paths (null bytes, etc.)

**Design Notes:**
- Throws custom error types
- Logs validation failures
- Early validation (fail fast)

#### Logger (`logger.ts`)

**Responsibility**: Structured logging

**Key Functions:**
- Log at different levels (debug, info, warn, error)
- Format with timestamp and namespace
- Include contextual data

**Design Notes:**
- Logs to stderr (doesn't interfere with MCP stdio)
- Namespaced loggers for each module
- JSON serialization of context objects
- Error objects properly formatted with stack traces

### Foundation Layer

#### Types (`types.ts`)

**Responsibility**: Type definitions and custom errors

**Contents:**
- `C2PAResult`: Standard result format
- `C2PAManifest`: Manifest data type
- `ReadCredentials*Params`: Input parameter types
- Custom error classes:
  - `C2PAError` (base)
  - `FileNotFoundError`
  - `InvalidUrlError`
  - `DownloadError`
  - `C2PToolError`

**Design Notes:**
- All errors extend base `C2PAError`
- Errors include error codes and details
- Proper prototype chain setup for `instanceof` checks

#### Constants (`constants.ts`)

**Responsibility**: Application configuration

**Contents:**
- Buffer sizes
- File name prefixes
- Timeout values
- Server metadata
- Supported file extensions

**Design Notes:**
- All constants are `const` or `readonly`
- Values have clear names and JSDoc comments
- Numeric values use underscore separators (e.g., `30_000`)

## Data Flow

### File Path Flow

```
User provides file path
    ↓
index.ts receives request
    ↓
Calls c2paService.readCredentialsFromFile()
    ↓
validators.validateFilePath()
    ↓
file-utils.ensureFileExists()
    ↓
c2paService.executeC2PATool()
    ↓
c2paService.parseC2PAOutput()
    ↓
Returns C2PAResult
    ↓
index.ts formats response
    ↓
Returns to MCP client
```

### URL Flow

```
User provides URL
    ↓
index.ts receives request
    ↓
Calls c2paService.readCredentialsFromUrl()
    ↓
validators.validateUrl()
    ↓
file-utils.downloadFile()
    ↓
[Same as file path flow from ensureFileExists()]
    ↓
file-utils.safeDelete() (cleanup)
    ↓
Returns C2PAResult
```

## Error Handling Strategy

### Error Types Hierarchy

```
Error (built-in)
  └── C2PAError (base custom error)
        ├── FileNotFoundError
        ├── InvalidUrlError
        ├── DownloadError
        └── C2PToolError
```

### Error Handling Pattern

1. **Validation Layer**: Throws specific errors early
2. **Service Layer**: Catches all errors, logs, returns structured result
3. **Protocol Layer**: Catches remaining errors, formats for MCP

### Example

```typescript
// Service layer
async readCredentialsFromFile(filePath: string): Promise<C2PAResult> {
  try {
    validateFilePath(filePath);      // May throw InvalidInputError
    await ensureFileExists(filePath); // May throw FileNotFoundError
    const result = await exec(...);   // May throw C2PToolError
    return { success: true, ... };
  } catch (error) {
    logger.error('Failed', error);
    return { 
      success: false,
      hasCredentials: false,
      error: error.message
    };
  }
}
```

## Logging Strategy

### Log Levels

- **debug**: Detailed information for debugging (e.g., file paths, URLs)
- **info**: Important events (e.g., operation started, completed)
- **warn**: Warning conditions (e.g., cleanup failures)
- **error**: Error conditions (e.g., validation failures, execution errors)

### Namespaces

- `mcp-server`: Protocol layer
- `c2pa-service`: Business logic
- `file-utils`: File operations
- `validators`: Input validation

### Example

```typescript
const logger = createLogger('c2pa-service');

logger.info('Reading credentials from file', { filePath });
logger.error('Failed to execute c2patool', error, { filePath, exitCode });
```

## Testing Strategy (Future)

### Unit Tests
- Test pure functions in isolation
- Mock file system operations
- Mock c2patool execution
- Test error handling paths

### Integration Tests
- Test service layer with real files
- Test URL downloads with test server
- Test error scenarios

### E2E Tests
- Test full MCP request/response cycle
- Use test MCP client
- Test with actual c2patool

## Performance Considerations

### Current Optimizations
- Streaming downloads (pipeline)
- Proper buffer sizes for large manifests
- Cleanup in finally blocks
- Timeouts on network operations

### Future Optimizations
- Caching of downloaded files
- Parallel processing of multiple files
- Connection pooling for downloads

## Security Considerations

1. **Input Validation**: All inputs validated before use
2. **Path Traversal**: File path validation prevents null bytes
3. **URL Security**: Only http/https protocols allowed
4. **Temporary Files**: Cleaned up after use
5. **Buffer Limits**: Max buffer size prevents DoS
6. **Timeout**: Download timeout prevents hanging

## Extensibility

### Adding New Tools

1. Define types in `types.ts`
2. Add business logic method to `c2pa-service.ts`
3. Add tool definition in `index.ts` ListTools handler
4. Add case in `index.ts` CallTool handler
5. Update documentation

### Adding New File Sources

1. Add utility function to `file-utils.ts`
2. Add validation to `validators.ts`
3. Add service method to `c2pa-service.ts`
4. Follow "Adding New Tools" steps

### Adding New Error Types

1. Define in `types.ts` extending `C2PAError`
2. Set proper prototype chain
3. Use in appropriate utility/service layer
4. Document in README

## Dependencies

### Production Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation

### Development Dependencies
- `typescript`: Type system and compiler
- `ts-node`: Development execution
- `@types/node`: Node.js type definitions
- `eslint`: Linting
- `@typescript-eslint/*`: TypeScript ESLint rules
- `prettier`: Code formatting
- `eslint-config-prettier`: ESLint + Prettier integration
- `eslint-plugin-prettier`: Prettier as ESLint plugin

## Build Process

```
TypeScript Source (src/)
    ↓
TypeScript Compiler (tsc)
    ↓
JavaScript + Source Maps + Type Definitions (build/)
    ↓
Executable Entry Point (build/index.js)
```

**Configuration:**
- `tsconfig.json`: Compiler options
- `module: "nodenext"`: ES modules
- `target: "esnext"`: Modern JavaScript
- `strict: true`: Strict type checking
- Source maps enabled for debugging

## Deployment

### Development
```bash
npm run dev  # Uses ts-node --esm
```

### Production
```bash
npm run build  # Compiles to build/
npm start      # Runs build/index.js
```

### MCP Integration
Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "content-credentials": {
      "command": "node",
      "args": ["/path/to/build/index.js"]
    }
  }
}
```

## Future Enhancements

### Potential Features
1. Batch processing multiple files
2. Caching layer for repeated checks
3. Support for more file formats
4. Credential verification (not just reading)
5. Generating C2PA manifests
6. Integration with cloud storage (S3, GCS)

### Technical Improvements
1. Add comprehensive test suite
2. Add performance monitoring
3. Add metrics collection
4. Add health check endpoint
5. Add graceful degradation
6. Add retry logic for transient failures

## Maintenance

### Regular Tasks
- Keep dependencies updated
- Monitor for security vulnerabilities
- Review and update error messages
- Optimize performance bottlenecks
- Improve documentation based on user feedback

### Code Review Focus
- Type safety maintained
- Error handling comprehensive
- Logging appropriate
- No business logic in protocol layer
- Tests pass (when added)
- Documentation updated

