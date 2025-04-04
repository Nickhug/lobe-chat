import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { promises as fsPromises } from 'node:fs';

// Define log directory
const LOGS_DIR = process.env.USAGE_LOGS_DIR || path.join(process.cwd(), 'data', 'usage-logs');

// Function to append log entry
async function appendLog(userId: string, data: any) {
  try {
    // Ensure directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      await fsPromises.mkdir(LOGS_DIR, { recursive: true });
    }

    const date = new Date();
    const filePath = path.join(LOGS_DIR, `${userId}_${date.getFullYear()}-${date.getMonth() + 1}.jsonl`);
    const logEntry = {
      ...data,
      timestamp: date.toISOString()
    };
    
    await fsPromises.appendFile(filePath, JSON.stringify(logEntry) + '\n', 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write usage log:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.userId || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields (userId, type)' },
        { status: 400 }
      );
    }
    
    const success = await appendLog(data.userId, data);
    
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error logging usage:', error);
    return NextResponse.json(
      { error: 'Failed to log usage data' },
      { status: 500 }
    );
  }
}

// Export the appendLog function to be used by other server components
export { appendLog }; 