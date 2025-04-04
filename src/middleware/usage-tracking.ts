import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define log directory
const LOGS_DIR = process.env.USAGE_LOGS_DIR || path.join(process.cwd(), 'data', 'usage-logs');

// Make sure log directory exists
function ensureLogDir() {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
}

// Initialize directory
ensureLogDir();

// Function to append log entry
export function appendLog(userId: string, data: any) {
  try {
    const date = new Date();
    const filePath = path.join(LOGS_DIR, `${userId}_${date.getFullYear()}-${date.getMonth() + 1}.jsonl`);
    const logEntry = {
      ...data,
      timestamp: date.toISOString()
    };
    
    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf-8');
  } catch (error) {
    console.error('Failed to write usage log:', error);
  }
}

// Middleware function to track API usage
export async function trackApiUsage(request: NextRequest) {
  // Skip non-API requests
  if (!request.url.includes('/api/chat')) {
    return NextResponse.next();
  }

  // Only track POST requests to chat endpoints
  if (request.method !== 'POST') {
    return NextResponse.next();
  }
  
  // Extract user ID from auth header or cookie
  const userId = request.headers.get('x-user-id') || 
                 request.cookies.get('user_id')?.value || 
                 'anonymous';

  // Clone the request to read its body
  try {
    const requestClone = request.clone();
    const requestBody = await requestClone.json();
    
    // Record the request (input/prompt) information
    const promptData = {
      type: 'prompt',
      model: requestBody.model,
      provider: requestBody.provider || 'unknown',
      userId,
      messageId: requestBody.messageId || crypto.randomUUID(),
      sessionId: requestBody.sessionId,
      promptLength: JSON.stringify(requestBody.messages || []).length,
      stream: !!requestBody.stream
    };
    
    appendLog(userId, promptData);
  } catch (e) {
    console.error('Failed to process request for usage tracking:', e);
  }
  
  // Continue with the normal request flow
  return NextResponse.next();
} 