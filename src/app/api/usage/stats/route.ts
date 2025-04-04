import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { createPool } from '@vercel/postgres';

// Define row types
interface SummaryRow {
  total_tokens: string;
  total_messages: string;
}

interface ModelBreakdownRow {
  provider: string;
  model: string;
  total_tokens: string;
  message_count: string;
}

interface ToolUsageRow {
  name: string;
  count: string;
}

interface DailyUsageRow {
  date: Date;
  tokens: string;
}

interface RecentActivityRow {
  timestamp: Date;
  model: string;
  provider: string;
  type: string;
  tool_name: string;
  tokens: string;
}

// Initialize database connection
const pool = process.env.POSTGRES_URL 
  ? createPool({ connectionString: process.env.POSTGRES_URL })
  : new Pool({ connectionString: process.env.DATABASE_URL });

// Function to get usage statistics from Neon DB
async function getUsageStats(userId: string, startDate?: Date, endDate?: Date) {
  console.log(`[STATS API] Getting stats for user: ${userId}`);
  try {
    // Initialize response structure
    const summary = {
      totalTokens: 0,
      totalMessages: 0
    };
    
    // Build the WHERE clause with parameters
    const params: any[] = [userId];
    let timeQuery = '';
    
    if (startDate) {
      timeQuery += ' AND timestamp >= $2';
      params.push(startDate);
      console.log(`[STATS API] Filtering from: ${startDate.toISOString()}`);
    }
    
    if (endDate) {
      timeQuery += ` AND timestamp <= $${params.length + 1}`;
      params.push(endDate);
      console.log(`[STATS API] Filtering to: ${endDate.toISOString()}`);
    }
    
    console.log(`[STATS API] Executing summary query for user: ${userId}`);
    
    // Get summary stats for completions
    const summaryResult = await pool.query(`
      SELECT 
        SUM(total_tokens) as total_tokens,
        COUNT(*) as total_messages
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'completion'${timeQuery}
    `, params);
    
    console.log(`[STATS API] Summary rows returned: ${summaryResult.rows.length}`);
    
    if (summaryResult.rows.length > 0) {
      const row = summaryResult.rows[0] as SummaryRow;
      summary.totalTokens = parseInt(row.total_tokens) || 0;
      summary.totalMessages = parseInt(row.total_messages) || 0;
    }
    
    // Also count tool messages for total message count
    const toolMessageCountResult = await pool.query(`
      SELECT COUNT(*) as tool_message_count
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'tool'${timeQuery}
    `, params);
    
    if (toolMessageCountResult.rows.length > 0) {
      const toolCount = parseInt(toolMessageCountResult.rows[0].tool_message_count) || 0;
      summary.totalMessages += toolCount;
    }
    
    console.log(`[STATS API] Summary stats: ${JSON.stringify(summary)}`);
    console.log(`[STATS API] Executing model breakdown query`);
    
    // Get model breakdown
    const modelBreakdownResult = await pool.query(`
      SELECT 
        provider,
        model,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as message_count
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'completion'${timeQuery}
      GROUP BY provider, model
    `, params);
    
    console.log(`[STATS API] Model breakdown rows: ${modelBreakdownResult.rows.length}`);
    
    const modelBreakdown = modelBreakdownResult.rows.map((row: ModelBreakdownRow) => {
      const totalTokens = parseInt(row.total_tokens) || 0;
      
      return {
        provider: row.provider,
        model: row.model,
        totalTokens,
        messageCount: parseInt(row.message_count) || 0
      };
    });
    
    console.log(`[STATS API] Executing tool usage query`);
    
    // Get tool usage
    const toolUsageResult = await pool.query(`
      SELECT 
        tool_name as name,
        COUNT(*) as count
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'tool'${timeQuery}
      GROUP BY tool_name
    `, params);
    
    console.log(`[STATS API] Tool usage rows: ${toolUsageResult.rows.length}`);
    
    const toolUsage = toolUsageResult.rows.map((row: ToolUsageRow) => ({
      name: row.name,
      count: parseInt(row.count) || 0
    }));
    
    console.log(`[STATS API] Executing daily usage query`);
    
    // Get daily usage
    const dailyUsageResult = await pool.query(`
      SELECT 
        DATE_TRUNC('day', timestamp) as date,
        SUM(total_tokens) as tokens
      FROM usage_logs 
      WHERE user_id = $1 AND total_tokens IS NOT NULL${timeQuery}
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY date DESC
    `, params);
    
    console.log(`[STATS API] Daily usage rows: ${dailyUsageResult.rows.length}`);
    
    const dailyUsage = dailyUsageResult.rows.map((row: DailyUsageRow) => ({
      date: row.date.toISOString().split('T')[0],
      tokens: parseInt(row.tokens) || 0
    }));
    
    console.log(`[STATS API] Executing recent activity query`);
    
    // Get recent activity
    const recentActivityResult = await pool.query(`
      SELECT 
        timestamp,
        model,
        provider,
        type,
        tool_name,
        total_tokens as tokens
      FROM usage_logs 
      WHERE user_id = $1 AND (type = 'completion' OR type = 'tool')${timeQuery}
      ORDER BY timestamp DESC
      LIMIT 10
    `, params);
    
    console.log(`[STATS API] Recent activity rows: ${recentActivityResult.rows.length}`);
    
    const recentActivity = recentActivityResult.rows.map((row: RecentActivityRow) => {
      const tokens = parseInt(row.tokens) || 0;
      
      return {
        timestamp: row.timestamp.toISOString(),
        model: row.model,
        provider: row.provider,
        type: row.type,
        toolName: row.tool_name,
        tokens
      };
    });
    
    const result = {
      summary,
      modelBreakdown,
      toolUsage,
      dailyUsage,
      recentActivity
    };
    
    console.log(`[STATS API] Successfully retrieved usage data for user: ${userId}`);
    return result;
  } catch (error) {
    console.error('[STATS API] Error processing usage stats:', error);
    // Return empty data if database query fails
    return {
      summary: { 
        totalTokens: 0,
        totalMessages: 0
      },
      modelBreakdown: [],
      toolUsage: [],
      dailyUsage: [],
      recentActivity: []
    };
  }
}

export async function GET(req: NextRequest) {
  console.log('[STATS API] Received stats request');
  try {
    const { searchParams } = new URL(req.url);
    
    // Get user ID from query parameter or auth header
    let userId = searchParams.get('userId');
    if (!userId) {
      const headerUserId = req.headers.get('x-user-id');
      const cookieUserId = req.cookies.get('user_id')?.value || null;
      userId = headerUserId || cookieUserId;
    }
    
    console.log(`[STATS API] Getting stats for user ID: ${userId || 'not provided'}`);
    
    if (!userId) {
      console.log('[STATS API] Missing user ID, returning 400');
      return NextResponse.json(
        { error: 'User ID is required' }, 
        { status: 400 }
      );
    }
    
    // Parse date filters if provided
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (startDateParam) {
      startDate = new Date(startDateParam);
      console.log(`[STATS API] Start date: ${startDate.toISOString()}`);
    }
    
    if (endDateParam) {
      endDate = new Date(endDateParam);
      console.log(`[STATS API] End date: ${endDate.toISOString()}`);
    }
    
    // Get usage statistics from database
    const stats = await getUsageStats(userId, startDate, endDate);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[STATS API] Error retrieving usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve usage statistics' },
      { status: 500 }
    );
  }
} 