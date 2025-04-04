import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { promises as fsPromises } from 'node:fs';

// Define log directory
const LOGS_DIR = process.env.USAGE_LOGS_DIR || path.join(process.cwd(), 'data', 'usage-logs');

// Function to read and process log files
async function processLogs(userId: string, startDate?: Date, endDate?: Date) {
  try {
    // Get all log files for this user
    if (!fs.existsSync(LOGS_DIR)) {
      await fsPromises.mkdir(LOGS_DIR, { recursive: true });
      return {
        summary: { totalTokens: 0, inputTokens: 0, outputTokens: 0, totalMessages: 0 },
        modelBreakdown: [],
        toolUsage: [],
        dailyUsage: [],
        recentActivity: []
      };
    }

    const files = await fsPromises.readdir(LOGS_DIR);
    const userFiles = files.filter(file => file.startsWith(userId + '_'));
    
    // Initialize accumulators
    const summary = {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalMessages: 0
    };
    
    const modelBreakdown: Record<string, any> = {};
    const toolUsage: Record<string, number> = {};
    const dailyUsage: Record<string, number> = {};
    const recentActivity: any[] = [];
    
    // Process each log file
    for (const file of userFiles) {
      const filePath = path.join(LOGS_DIR, file);
      const fileContent = await fsPromises.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n').filter(Boolean);
      
      // Process each log entry
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryDate = new Date(entry.timestamp);
          
          // Apply date filters if specified
          if (startDate && entryDate < startDate) continue;
          if (endDate && entryDate > endDate) continue;
          
          // Process completion entries
          if (entry.type === 'completion') {
            // Update summary stats
            summary.totalTokens += entry.totalTokens || 0;
            summary.inputTokens += entry.inputTokens || 0;
            summary.outputTokens += entry.outputTokens || 0;
            summary.totalMessages++;
            
            // Update model breakdown
            const modelKey = `${entry.provider}:${entry.model}`;
            if (!modelBreakdown[modelKey]) {
              modelBreakdown[modelKey] = {
                provider: entry.provider,
                model: entry.model,
                totalTokens: 0,
                messageCount: 0
              };
            }
            
            modelBreakdown[modelKey].totalTokens += entry.totalTokens || 0;
            modelBreakdown[modelKey].messageCount++;
            
            // Update daily usage
            const dateKey = entryDate.toISOString().split('T')[0];
            dailyUsage[dateKey] = (dailyUsage[dateKey] || 0) + (entry.totalTokens || 0);
            
            // Add to recent activity
            recentActivity.push({
              timestamp: entry.timestamp,
              model: entry.model,
              provider: entry.provider,
              tokens: entry.totalTokens || 0
            });
          }
          
          // Process tool usage entries
          if (entry.type === 'tool') {
            const toolName = entry.toolName;
            toolUsage[toolName] = (toolUsage[toolName] || 0) + 1;
          }
        } catch (error) {
          console.error('Error processing log entry:', error);
        }
      }
    }
    
    // Sort recent activity by timestamp (newest first)
    recentActivity.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Limit to most recent 10 activities
    const recentActivitiesLimited = recentActivity.slice(0, 10);
    
    // Convert record objects to arrays for the response
    return {
      summary,
      modelBreakdown: Object.values(modelBreakdown),
      toolUsage: Object.entries(toolUsage).map(([name, count]) => ({ name, count })),
      dailyUsage: Object.entries(dailyUsage).map(([date, tokens]) => ({ date, tokens })),
      recentActivity: recentActivitiesLimited
    };
    
  } catch (error) {
    console.error('Error processing usage logs:', error);
    throw error;
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
    
    // Process logs and return usage statistics
    const stats = await processLogs(userId, startDate, endDate);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error retrieving usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve usage statistics' },
      { status: 500 }
    );
  }
} 