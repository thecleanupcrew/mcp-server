# Code Mode Rules

## Server Commands

- Use `npm run start` to start the MCP server, not `node index.js`

## Project Overview

This is an MCP (Model Context Protocol) server that provides API-based help request functionality. The server captures comprehensive context about development issues and facilitates human assistance through structured help requests sent to external APIs.

## Architecture Principles

### Modular Design

- Maintain clear separation of concerns across directories
- Each module should have a single, well-defined responsibility
- Use dependency injection where appropriate
- Keep modules loosely coupled and highly cohesive

### API-First Approach

- All external integrations should go through the `src/api/` layer
- Support both mock and production modes for all API integrations
- Use environment variables for API configuration
- Implement proper error handling and retry logic for API calls

### Schema Validation Requirements

- All tool parameters must be validated using Zod schemas
- Schema definitions should be centralized in `src/schemas/`
- Provide clear error messages for validation failures
- Document schema structure in JSDoc comments

### Logging Standards

- Use structured logging with consistent context
- Include sessionId and timestamp in all relevant log entries
- Log at appropriate levels (DEBUG, INFO, WARN, ERROR)
- Never log sensitive information (passwords, tokens, personal data)

## Directory Structure Rules

### `src/api/` - API Integration Logic

- Contains all external API integration code
- Must support both mock and production modes
- Each API client should have its own file
- Include proper error handling and logging
- Example: `helpRequestAPI.js` handles help request API calls

### `src/config/` - Configuration Management

- Centralized configuration files
- Logger configuration and setup
- Environment-specific settings
- No business logic should be in config files

### `src/constants/` - Application Constants

- Shared constants and configuration values
- Environment variable defaults
- File processing limits and constraints
- Directory ignore patterns
- Export as named constants, not default exports

### `src/schemas/` - Zod Validation Schemas

- All Zod schema definitions
- One schema file per major entity/tool
- Include JSDoc documentation for each schema
- Export schemas as named exports

### `src/tools/` - MCP Tool Implementations

- Individual tool implementations
- Each tool should have its own file
- Export tools from `index.js`
- Include comprehensive error handling

### `src/utils/` - Utility Functions

- Reusable utility functions
- Pure functions when possible
- Well-documented with JSDoc
- No side effects unless explicitly documented

## Error Handling Standards

### API Error Handling Pattern

```javascript
try {
  const response = await apiCall()
  logger.info('API call successful', { sessionId, endpoint })
  return response
} catch (error) {
  logger.error('API call failed', {
    error: error.message,
    sessionId,
    endpoint,
    stack: error.stack,
  })
  throw new Error(`API operation failed: ${error.message}`)
}
```

### Tool Execution Error Handling

```javascript
export const toolName = {
  name: 'tool_name',
  description: 'Tool description',
  inputSchema: schema,
  handler: async (args) => {
    try {
      // Tool logic here
      logger.info('Tool executed successfully', {
        tool: 'tool_name',
        sessionId: args.sessionId,
      })
      return { success: true, data: result }
    } catch (error) {
      logger.error('Tool execution failed', {
        tool: 'tool_name',
        error: error.message,
        sessionId: args.sessionId,
        stack: error.stack,
      })
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
      }
    }
  },
}
```

### Proper Error Logging

- Always include relevant context (sessionId, tool name, etc.)
- Log the full error stack for debugging
- Use appropriate log levels
- Provide actionable error messages to users

## Logging Conventions

### Log Levels

- **DEBUG**: Detailed information for debugging (development only)
- **INFO**: General information about application flow
- **WARN**: Warning conditions that don't stop execution
- **ERROR**: Error conditions that require attention

### Required Context

Always include these fields when available:

```javascript
logger.info('Operation description', {
  sessionId: 'uuid-here',
  timestamp: new Date().toISOString(),
  operation: 'operation_name',
  // Additional relevant context
})
```

### Log Format Examples

```javascript
// Successful operation
logger.info('Help request processed successfully', {
  sessionId: session.sessionId,
  apiEndpoint: HELP_API_CONFIG.endpoint,
  responseTime: Date.now() - startTime,
})

// Error condition
logger.error('Schema validation failed', {
  sessionId: session.sessionId,
  tool: 'request_help',
  validationErrors: error.errors,
  inputData: sanitizedInput,
})

// API call
logger.debug('Making API request', {
  sessionId: session.sessionId,
  endpoint: url,
  method: 'POST',
  headers: sanitizedHeaders,
})
```

## Schema Validation Requirements

### Zod Schema Standards

- Use descriptive schema names that match their purpose
- Include JSDoc comments explaining the schema purpose
- Provide clear descriptions for each field
- Use appropriate Zod validators for data types

### Schema Organization Pattern

```javascript
/**
 * Schema for help request session information
 */
export const sessionSchema = z.object({
  sessionId: z.string().uuid().describe('Unique session identifier'),
  timestamp: z.string().describe('ISO timestamp when session was created'),
})

/**
 * Main help request schema combining all components
 */
export const helpRequestSchema = z.object({
  session: sessionSchema,
  conversation: conversationSchema,
  issue: issueSchema,
  // ... other optional schemas
})
```

### Validation Error Handling

```javascript
try {
  const validatedData = schema.parse(inputData)
  return validatedData
} catch (error) {
  logger.error('Schema validation failed', {
    sessionId: inputData.session?.sessionId,
    errors: error.errors,
    tool: 'tool_name',
  })
  throw new Error(
    `Invalid input: ${error.errors.map((e) => e.message).join(', ')}`
  )
}
```

## Code Quality Standards

### Function Documentation

- Use JSDoc comments for all exported functions
- Include parameter types and descriptions
- Document return values and possible exceptions
- Provide usage examples for complex functions

### Import/Export Conventions

- Use named exports instead of default exports
- Group imports: external libraries first, then internal modules
- Use consistent import ordering within groups
- Avoid circular dependencies

### Environment Variable Handling

- Define all environment variables in `src/constants/index.js`
- Provide sensible defaults for development
- Document required vs optional environment variables
- Use descriptive variable names with consistent prefixes

### Testing Considerations

- Write code that is easily testable
- Avoid hard dependencies on external services in core logic
- Use dependency injection for external dependencies
- Provide mock implementations for development and testing
