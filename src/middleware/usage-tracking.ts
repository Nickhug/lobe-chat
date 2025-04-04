import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { appendLog } from '@/utils/logger/usageLogger';

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