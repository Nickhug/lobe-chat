# Usage Tracking with Neon DB

This document explains how the usage tracking system works in LobeChat, using Neon DB for server-side analytics.

## Overview

The usage tracking system logs user interactions with language models, including:
- Prompts and completions
- Token usage
- Model and provider information
- Tool usage

All data is stored in a PostgreSQL database (Neon DB) for efficient querying and reporting.

## Setup

1. Create a Neon DB account and database at https://neon.tech/
2. Add the following environment variables to your `.env` file:

```
# Neon DB Connection
DATABASE_URL=postgres://username:password@host:port/database
```

3. The system will automatically create the required tables on startup.

## Data Structure

The usage tracking system stores data in a `usage_logs` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  message_id TEXT,
  session_id TEXT,
  prompt_length INTEGER,
  total_tokens INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  tool_name TEXT,
  data JSONB
);
```

## API Endpoints

### Get Usage Statistics

```
GET /api/usage/stats?userId=<user_id>&startDate=<ISO_date>&endDate=<ISO_date>
```

Returns:
- Total token usage
- Token breakdown (input/output)
- Usage by model
- Usage by tool
- Daily usage trends
- Recent activity

## Implementation Details

The system consists of the following components:

1. **Middleware** (`src/middleware/usage-tracking.ts`): Tracks API requests for prompts
2. **Logger Utility** (`src/utils/logger/usageLogger.ts`): Handles database operations
3. **API Routes**:
   - `src/app/api/chat/route.ts`: Tracks completions and tool usage
   - `src/app/api/usage/stats/route.ts`: Retrieves usage statistics
   - `src/app/api/usage/log/route.ts`: Direct logging endpoint

## Security

User data is associated with a unique user ID. No personal information is stored other than the user ID and their usage patterns.

## Dashboard

Usage statistics can be viewed in the Settings page under the "Usage" section.

## Future Improvements

- Add rate limiting to prevent abuse
- Implement data retention policies
- Add export functionality for usage data
- Improve dashboard visualizations 