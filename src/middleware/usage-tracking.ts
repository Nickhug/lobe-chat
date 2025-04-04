import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { appendLog } from '@/utils/logger/usageLogger';

// Middleware function to track API usage
export async function trackApiUsage(request: NextRequest) {
  console.log('[MIDDLEWARE] Processing request:', request.url);
  
  // Skip non-API requests
  if (!request.url.includes('/api/chat')) {
    console.log('[MIDDLEWARE] Skipping non-chat API request');
    return NextResponse.next();
  }

  // Only track POST requests to chat endpoints
  if (request.method !== 'POST') {
    console.log('[MIDDLEWARE] Skipping non-POST request');
    return NextResponse.next();
  }
  
  console.log('[MIDDLEWARE] Processing chat API POST request');
  
  // Extract user ID from auth header or cookie
  const userId = request.headers.get('x-user-id') || 
                 request.cookies.get('user_id')?.value || 
                 'anonymous';
  
  console.log(`[MIDDLEWARE] User ID: ${userId}`);

  // Clone the request to read its body
  try {
    const requestClone = request.clone();
    const requestBody = await requestClone.json();
    
    console.log(`[MIDDLEWARE] Request model: ${requestBody.model || 'unknown'}, provider: ${requestBody.provider || 'unknown'}`);
    
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
    
    // Log using the edge-compatible logger
    console.log('[MIDDLEWARE] Logging prompt data via middleware');
    const logSuccess = await appendLog(userId, promptData);
    console.log(`[MIDDLEWARE] Middleware logging result: ${logSuccess ? 'success' : 'failed'}`);
  } catch (e) {
    console.error('[MIDDLEWARE] Failed to process request for usage tracking:', e);
  }
  
  // Continue with the normal request flow
  console.log('[MIDDLEWARE] Continuing with request');
  return NextResponse.next();
} 