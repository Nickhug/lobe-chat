// Edge-compatible logger utility
// Instead of direct file system access, we'll use an API endpoint approach

import { Pool } from '@neondatabase/serverless';
import { createPool } from '@vercel/postgres';

// Initialize database connection
const pool = process.env.POSTGRES_URL 
  ? createPool({ connectionString: process.env.POSTGRES_URL })
  : new Pool({ connectionString: process.env.DATABASE_URL });

// Setup table if it doesn't exist
async function ensureTable() {
  try {
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
      
      CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON usage_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_usage_logs_type ON usage_logs(type);
    `);
    return true;
  } catch (error) {
    console.error('Failed to ensure usage_logs table exists:', error);
    return false;
  }
}

// Ensure table exists when module is loaded
ensureTable().catch(console.error);

// Function to log entries to Neon DB
export async function appendLog(userId: string, data: any) {
  try {
    // Only run on server
    if (typeof window !== 'undefined') return true;
    
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
    
    // Insert into database
    await pool.query(
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
    );
    
    return true;
  } catch (error) {
    console.error('Failed to write usage log to database:', error);
    return false;
  }
} 