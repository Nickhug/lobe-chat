// Edge-compatible logger utility
// Instead of direct file system access, we'll use an API endpoint approach

import { Pool } from '@neondatabase/serverless';
import { createPool } from '@vercel/postgres';

// Debug connection info
const DATABASE_URL = process.env.DATABASE_URL || '';
const POSTGRES_URL = process.env.POSTGRES_URL || '';
console.log(`[USAGE DB] Database connection available: DATABASE_URL=${!!DATABASE_URL}, POSTGRES_URL=${!!POSTGRES_URL}`);

// Initialize database connection with better error handling
let pool: any;
try {
  if (POSTGRES_URL) {
    console.log('[USAGE DB] Using POSTGRES_URL for connection');
    pool = createPool({ connectionString: POSTGRES_URL });
  } else if (DATABASE_URL) {
    console.log('[USAGE DB] Using DATABASE_URL for connection');
    pool = new Pool({ connectionString: DATABASE_URL });
  } else {
    console.error('[USAGE DB] No database connection URL found');
    // Create a dummy pool that logs errors
    pool = {
      query: async () => {
        throw new Error('No database connection available');
      }
    };
  }
} catch (error) {
  console.error('[USAGE DB] Failed to initialize database connection:', error);
  // Create a dummy pool that logs errors
  pool = {
    query: async () => {
      throw new Error('Database connection initialization failed');
    }
  };
}

// Setup table if it doesn't exist
async function ensureTable() {
  try {
    console.log('[USAGE DB] Attempting to ensure table exists...');
    await pool.query(`
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
    `);
    
    // Separate queries for indexes to handle potential errors
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);`);
    } catch (indexError) {
      console.error('[USAGE DB] Failed to create user_id index:', indexError);
    }
    
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp);`);
    } catch (indexError) {
      console.error('[USAGE DB] Failed to create timestamp index:', indexError);
    }
    
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_usage_logs_type ON usage_logs(type);`);
    } catch (indexError) {
      console.error('[USAGE DB] Failed to create type index:', indexError);
    }
    
    console.log('[USAGE DB] Table check/creation successful');
    return true;
  } catch (error) {
    console.error('[USAGE DB] Failed to ensure usage_logs table exists:', error);
    return false;
  }
}

// Test direct table access
async function testTableAccess() {
  try {
    console.log('[USAGE DB] Testing direct table access...');
    const testData = {
      user_id: 'test-user',
      timestamp: new Date(),
      type: 'test',
      data: JSON.stringify({ test: true })
    };
    
    await pool.query(
      `INSERT INTO usage_logs (user_id, timestamp, type, data) VALUES ($1, $2, $3, $4)`,
      [testData.user_id, testData.timestamp, testData.type, testData.data]
    );
    
    const result = await pool.query(`SELECT COUNT(*) FROM usage_logs WHERE user_id = 'test-user'`);
    console.log(`[USAGE DB] Test record count: ${result.rows[0].count}`);
    console.log('[USAGE DB] Table access test successful');
    return true;
  } catch (error) {
    console.error('[USAGE DB] Table access test failed:', error);
    return false;
  }
}

// Ensure table exists when module is loaded and test access
(async () => {
  try {
    const tableExists = await ensureTable();
    if (tableExists) {
      await testTableAccess();
    }
  } catch (error) {
    console.error('[USAGE DB] Initialization error:', error);
  }
})();

// Function to log entries to Neon DB with retry
export async function appendLog(userId: string, data: any) {
  // Only run on server
  if (typeof window !== 'undefined') return true;
  
  console.log(`[USAGE LOG] Attempting to log data for user: ${userId}, type: ${data.type}`);
  
  // Maximum number of retry attempts
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      const timestamp = new Date();
      
      // Extract common fields from data
      const { 
        type, 
        model, 
        provider, 
        messageId, 
        sessionId, 
        promptLength,
        totalTokens,
        inputTokens,
        outputTokens,
        toolName
      } = data;
      
      // Simple direct log first - helpful for debugging
      console.log(JSON.stringify({
        log_type: 'usage_log',
        user_id: userId,
        type,
        model,
        provider,
        timestamp: timestamp.toISOString(),
        total_tokens: totalTokens
      }));
      
      // Insert into database with timeout
      await Promise.race([
        pool.query(
          `INSERT INTO usage_logs (
            user_id, timestamp, type, model, provider, message_id, session_id, 
            prompt_length, total_tokens, input_tokens, output_tokens, tool_name, data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            userId,
            timestamp,
            type,
            model || null,
            provider || null,
            messageId || null,
            sessionId || null,
            promptLength || null,
            totalTokens || null,
            inputTokens || null,
            outputTokens || null,
            toolName || null,
            JSON.stringify(data)
          ]
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
      
      console.log(`[USAGE LOG] Successfully logged ${type} data for user: ${userId}`);
      return true;
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`[USAGE LOG] Error on attempt ${retryCount}/${maxRetries}:`, error);
      
      // Wait before retrying (exponential backoff)
      if (retryCount < maxRetries) {
        const delay = 1000 * Math.pow(2, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[USAGE LOG] Failed to write usage log after ${maxRetries} attempts. Last error:`, lastError);
  return false;
} 