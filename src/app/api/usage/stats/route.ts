import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { createPool } from '@vercel/postgres';

// Define row types
interface SummaryRow {
  total_tokens: string;
  input_tokens: string;
  output_tokens: string;
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
  total_tokens: string;
}

// Initialize database connection
const pool = process.env.POSTGRES_URL 
  ? createPool({ connectionString: process.env.POSTGRES_URL })
  : new Pool({ connectionString: process.env.DATABASE_URL });

// Function to get usage statistics from Neon DB
async function getUsageStats(userId: string, startDate?: Date, endDate?: Date) {
  try {
    // Initialize response structure
    const summary = {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalMessages: 0
    };
    
    // Build the WHERE clause with parameters
    const params: any[] = [userId];
    let timeQuery = '';
    
    if (startDate) {
      timeQuery += ' AND timestamp >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      timeQuery += ` AND timestamp <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    // Get summary stats for completions
    const summaryResult = await pool.query(`
      SELECT 
        SUM(total_tokens) as total_tokens,
        SUM(input_tokens) as input_tokens, 
        SUM(output_tokens) as output_tokens,
        COUNT(*) as total_messages
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'completion'${timeQuery}
    `, params);
    
    if (summaryResult.rows.length > 0) {
      const row = summaryResult.rows[0] as SummaryRow;
      summary.totalTokens = parseInt(row.total_tokens) || 0;
      summary.inputTokens = parseInt(row.input_tokens) || 0;
      summary.outputTokens = parseInt(row.output_tokens) || 0;
      summary.totalMessages = parseInt(row.total_messages) || 0;
    }
    
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
    
    const modelBreakdown = modelBreakdownResult.rows.map((row: ModelBreakdownRow) => ({
      provider: row.provider,
      model: row.model,
      totalTokens: parseInt(row.total_tokens) || 0,
      messageCount: parseInt(row.message_count) || 0
    }));
    
    // Get tool usage
    const toolUsageResult = await pool.query(`
      SELECT 
        tool_name as name,
        COUNT(*) as count
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'tool'${timeQuery}
      GROUP BY tool_name
    `, params);
    
    const toolUsage = toolUsageResult.rows.map((row: ToolUsageRow) => ({
      name: row.name,
      count: parseInt(row.count) || 0
    }));
    
    // Get daily usage
    const dailyUsageResult = await pool.query(`
      SELECT 
        DATE_TRUNC('day', timestamp) as date,
        SUM(total_tokens) as tokens
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'completion'${timeQuery}
      GROUP BY DATE_TRUNC('day', timestamp)
      ORDER BY date DESC
    `, params);
    
    const dailyUsage = dailyUsageResult.rows.map((row: DailyUsageRow) => ({
      date: row.date.toISOString().split('T')[0],
      tokens: parseInt(row.tokens) || 0
    }));
    
    // Get recent activity
    const recentActivityResult = await pool.query(`
      SELECT 
        timestamp,
        model,
        provider,
        total_tokens as tokens
      FROM usage_logs 
      WHERE user_id = $1 AND type = 'completion'${timeQuery}
      ORDER BY timestamp DESC
      LIMIT 10
    `, params);
    
    const recentActivity = recentActivityResult.rows.map((row: RecentActivityRow) => ({
      timestamp: row.timestamp.toISOString(),
      model: row.model,
      provider: row.provider,
      tokens: parseInt(row.total_tokens) || 0
    }));
    
    return {
      summary,
      modelBreakdown,
      toolUsage,
      dailyUsage,
      recentActivity
    };
  } catch (error) {
    console.error('Error processing usage stats:', error);
    // Return empty data if database query fails
    return {
      summary: { totalTokens: 0, inputTokens: 0, outputTokens: 0, totalMessages: 0 },
      modelBreakdown: [],
      toolUsage: [],
      dailyUsage: [],
      recentActivity: []
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get user ID from query parameter or auth header
    let userId = searchParams.get('userId');
    if (!userId) {
      const headerUserId = req.headers.get('x-user-id');
      const cookieUserId = req.cookies.get('user_id')?.value || null;
      userId = headerUserId || cookieUserId;
    }
    
    if (!userId) {
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
    }
    
    if (endDateParam) {
      endDate = new Date(endDateParam);
    }
    
    // Get usage statistics from database
    const stats = await getUsageStats(userId, startDate, endDate);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error retrieving usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve usage statistics' },
      { status: 500 }
    );
  }
} 