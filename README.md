# MCP Help Request Server

A Model Context Protocol (MCP) server that provides tools for capturing comprehensive context about development issues and facilitating human assistance through structured help requests.

## Overview

This server provides tools that allow AI assistants to capture detailed context about coding issues, workspace state, and user conversations, then facilitate human support through automated session management and Zoom meeting coordination.

## Features

- **Comprehensive Context Capture**: Automatically captures workspace state, file contents, error diagnostics, and conversation history
- **Structured Help Requests**: Uses Zod schemas to ensure consistent and complete help request data
- **Session Management**: Creates unique session IDs and logs for tracking help requests
- **Zoom Integration**: Automatically generates Zoom meeting links for immediate human assistance
- **Modular Architecture**: Clean separation of concerns with organized directory structure

## Architecture

```
src/
├── config/          # Configuration files
│   └── logger.js    # Winston logger configuration
├── constants/       # Application constants
│   └── index.js     # Shared constants and configuration values
├── schemas/         # Zod validation schemas
│   └── helpRequest.js # Help request schema definitions
├── tools/           # MCP tool implementations
│   ├── index.js     # Tool exports
│   ├── helpRequest.js # Main help request tool
│   └── getHelpSession.js # Session retrieval tool
├── utils/           # Utility functions
│   ├── workspace.js # Workspace analysis utilities
│   └── zoom.js      # Zoom link generation
└── server.js        # Main server setup and configuration

logs/                # Log files and session data
sessions/            # Session storage (future use)
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Starting the Server

```bash
npm start
```

The server runs using the FastMCP framework with stdio transport.

### Available Tools

#### 1. `request_help`

Captures comprehensive context about a development issue and creates a support session.

**Parameters:**

- `session` (required): Session information with unique ID and timestamp
- `conversation` (required): Recent conversation messages leading to the help request
- `issue` (required): Description of the problem that needs assistance
- `workspace` (optional): Information about the user's workspace/project
- `diagnostics` (optional): Error messages, warnings, or logs
- `solutionsAttempted` (optional): Previous attempts to solve the issue
- `environment` (optional): System environment details
- `dependencies` (optional): Project dependencies
- `versionControl` (optional): Git/version control information
- `performance` (optional): Performance metrics

**Returns:**

- Success message with Zoom meeting link
- Session ID for reference
- Context summary
- Next steps for the user

#### 2. `get_help_session`

Retrieves the context data for a specific help session.

**Parameters:**

- `sessionId` (required): The session ID to retrieve

**Returns:**

- Session data in JSON format
- Success/failure status

## Configuration

### Logger Configuration

The logger is configured in `src/config/logger.js` and creates:

- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output for development

### Constants

Application constants are defined in `src/constants/index.js`:

- Server configuration
- Zoom meeting settings
- File processing limits
- Directory ignore patterns

## Development

### Project Structure

The codebase follows a modular architecture:

- **Config**: Centralized configuration management
- **Schemas**: Zod validation schemas for type safety
- **Tools**: MCP tool implementations
- **Utils**: Reusable utility functions
- **Constants**: Shared application constants

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Export the tool from `src/tools/index.js`
3. Add the tool to the server in `src/server.js`

### Schema Validation

All tool parameters are validated using Zod schemas defined in `src/schemas/`. This ensures:

- Type safety
- Consistent data structure
- Clear documentation of expected inputs

## Dependencies

- **fastmcp**: MCP server framework
- **zod**: Schema validation
- **winston**: Logging
- **fs-extra**: Enhanced file system operations
- **uuid**: UUID generation
- **glob**: File pattern matching

## Logging

The server uses Winston for structured logging:

- All help requests are logged with session IDs
- Error conditions are captured with stack traces
- Session data is stored in individual JSON files
- Console output for development monitoring

## Session Management

Each help request creates:

- Unique session ID (UUID)
- Timestamped session log file
- Comprehensive context capture
- Zoom meeting link with session reference

## Error Handling

The server includes comprehensive error handling:

- Graceful degradation when workspace access fails
- Detailed error logging with context
- User-friendly error messages
- Session recovery capabilities

## License

ISC License

## Contributing

1. Follow the existing code structure
2. Add appropriate error handling
3. Include logging for debugging
4. Update documentation for new features
5. Ensure schema validation for new parameters
