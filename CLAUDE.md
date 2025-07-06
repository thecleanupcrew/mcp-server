# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start the server**: `npm run start` (uses fastmcp dev index.js)
- **No linting/testing commands**: This project does not have explicit lint or test scripts configured

## Project Architecture

This is a **Model Context Protocol (MCP) server** that provides tools for capturing development issue context and facilitating human assistance through structured API requests.

### Core Architecture

- **FastMCP Framework**: Uses the FastMCP library for MCP server implementation with stdio transport
- **Modular Design**: Clean separation between API integration, schemas, tools, and utilities
- **Zod Schema Validation**: All tool parameters validated using Zod schemas for type safety
- **Winston Logging**: Structured logging with session tracking and error capture

### Key Components

1. **Server Setup** (`src/server.js`): Creates FastMCP server instance and registers tools
2. **Tool System** (`src/tools/`): Single tool - `request_help`
3. **Schema System** (`src/schemas/helpRequest.js`): Comprehensive Zod schemas for help request validation
4. **API Integration** (`src/api/helpRequestAPI.js`): Handles external API calls with direct argument processing

### Data Flow

1. Client calls `request_help` tool with structured parameters
2. Tool validates input against Zod schemas
3. Tool generates session ID and timestamp automatically
4. Arguments are transformed into ticket format matching API schema:
   - `title` (min 5 chars): Brief description of the issue
   - `description`: Full issue description
   - `priority`: One of "low", "medium", "high", "urgent"
   - `metadata`: All arguments as JSON string key-value pairs
5. Ticket data is sent to external API endpoint
6. API response with ticket ID, status, and ticket URL is returned
7. User must click ticket URL to complete ticket creation process

## Configuration

### Environment Variables

- `API_ENDPOINT`: Ticket API endpoint (default: http://localhost:3000/api/tickets)
- `API_SERVICE_KEY`: Service key for API authentication (default: your_mcp_service_key_here)
- `PORT`: Server port (default: 8080)

### Constants Configuration

Key configuration in `src/constants/index.js`:
- File processing limits (max 5 active files, 50KB file size, 2000 char content)
- Directory ignore patterns (node_modules, .git, logs)
- Server transport configuration (httpStream)

## Schema System

The project uses comprehensive Zod schemas for validation:

- **HelpRequestSchema**: Main schema for help request tool
- **WorkspaceState**: Schema for workspace analysis data
- **Conversation**: Schema for conversation message arrays
- **Diagnostics**: Schema for errors, warnings, and logs
- **SessionInfo**: Schema for session tracking (optional, auto-generated)

## Tool Implementation

### `request_help` Tool
- Validates all parameters against Zod schemas
- Automatically generates session ID and timestamp
- Transforms arguments directly into API-compliant ticket format:
  - Title and description with minimum length validation
  - Priority determination based on diagnostics and keywords
  - All arguments stringified and stored in metadata
- Sends ticket data to external API with proper error handling
- Returns ticket URL that user must click to complete ticket creation
- Instructs agent to ask user to click the ticket link

## Logging and Session Management

- **Winston Logger**: Configured for both file and console output
- **Error Tracking**: Comprehensive error logging with stack traces
- **Session IDs**: UUID-based session tracking for help requests (auto-generated)

## Argument Processing

The system processes tool arguments directly:
- No workspace file access or content processing
- All arguments are stringified and passed to API in metadata
- Session information is automatically generated
- Minimal processing to maintain argument integrity

## API Schema Compliance

The ticket API expects data matching this schema:
- `title`: string (min 5 characters)
- `description`: string (min 10 characters) 
- `priority`: enum ["low", "medium", "high", "urgent"]
- `metadata`: record of string key-value pairs

All tool arguments are stored in the metadata field with values converted to strings:
- Each argument key becomes a metadata field with JSON.stringify(value)
- Session ID and timestamp are automatically added
- No additional processing or workspace analysis

## Error Handling

Robust error handling includes:
- Full API error response capture and display to users
- Detailed error logging with session context
- Graceful degradation when workspace access fails
- Clear user instructions when API calls fail

## Ticket Creation Process

1. MCP server receives tool arguments and prepares ticket data
2. API call creates ticket preparation in system
3. API returns ticket URL for user authentication
4. User must click ticket URL and login to finalize ticket creation
5. Only after user login is ticket officially created in support system

## Adding New Tools

1. Create tool file in `src/tools/`
2. Define Zod schema in `src/schemas/`
3. Export tool from `src/tools/index.js`
4. Register tool in `src/server.js`
5. Add appropriate logging and error handling
6. Ensure API schema compliance if integrating with external services
7. Include proper error response handling and user messaging