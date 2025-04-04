import { NextRequest, NextResponse } from 'next/server';
import { appendLog } from '@/utils/logger/usageLogger';

// Define interface for the tool_calls
interface ToolCall {
  id: string;
  type: string;
  function?: {
    name: string;
    arguments: string;
  };
}

// Utility function to safely get user ID
function getUserId(req: NextRequest): string {
  try {
    // Try from header first
    const headerUserId = req.headers.get('x-user-id');
    if (headerUserId) {
      console.log(`[CHAT API] Got user ID from header: ${headerUserId}`);
      return headerUserId;
    }
    
    // Try from cookies
    const cookieUserId = req.cookies.get('user_id')?.value;
    if (cookieUserId) {
      console.log(`[CHAT API] Got user ID from cookie: ${cookieUserId}`);
      return cookieUserId;
    }
    
    // Try Clerk or NextAuth ID from cookie/header if available
    const clerkUserId = req.cookies.get('__clerk_db_user_id')?.value || 
                       req.headers.get('x-clerk-user-id');
    if (clerkUserId) {
      console.log(`[CHAT API] Got user ID from Clerk: ${clerkUserId}`);
      return clerkUserId;
    }
    
    // Log all cookie names to help debugging
    const cookieNames = Array.from(req.cookies.getAll()).map(c => c.name);
    console.log(`[CHAT API] Available cookies: ${cookieNames.join(', ')}`);
    
    // Check for auth cookie patterns
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.includes('auth') || cookie.name.includes('user') || cookie.name.includes('session')) {
        console.log(`[CHAT API] Found potential auth cookie: ${cookie.name}`);
      }
    }
    
    console.log(`[CHAT API] No user ID found, using anonymous`);
    return 'anonymous';
  } catch (error) {
    console.error(`[CHAT API] Error getting user ID:`, error);
    return 'anonymous';
  }
}

// Helper function to safely log usage data
async function logUsageData(userId: string, data: any): Promise<boolean> {
  try {
    console.log(`[CHAT API] Logging ${data.type} data for user: ${userId}`);
    const success = await appendLog(userId, data);
    console.log(`[CHAT API] ${data.type} logging result: ${success ? 'success' : 'failed'}`);
    return success;
  } catch (error) {
    console.error(`[CHAT API] Error logging ${data.type} data:`, error);
    return false;
  }
}

// API handler for chat requests
export async function POST(req: NextRequest) {
  console.log('[CHAT API] Processing new chat request');
  
  try {
    const requestBody = await req.json();
    
    // Get a stable user ID from request
    const userId = getUserId(req);
    
    console.log(`[CHAT API] Request from user: ${userId}, model: ${requestBody.model || 'unknown'}`);
    
    // Log the prompt/request data
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
    
    // Log prompt data directly with appendLog
    await logUsageData(userId, promptData);
    
    // Mock response for testing - replace with actual LLM call
    const response = {
      id: crypto.randomUUID(),
      model: requestBody.model || 'gpt-4',
      provider: requestBody.provider || 'openai',
      usage: {
        total_tokens: 1500,
        prompt_tokens: 500,
        completion_tokens: 1000
      },
      choices: [{
        message: {
          content: "This is a mock response for testing the usage tracking system."
        }
      }],
      tool_calls: [] as ToolCall[]
    };
    
    // Log the completion data
    const completionData = {
      type: 'completion',
      model: response.model,
      provider: response.provider,
      userId,
      messageId: requestBody.messageId,
      sessionId: requestBody.sessionId,
      totalTokens: response.usage.total_tokens,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens
    };
    
    // Handle completion logging in a non-blocking way to avoid delaying response
    Promise.resolve().then(async () => {
      await logUsageData(userId, completionData);
    }).catch(error => {
      console.error('[CHAT API] Error in async completion logging:', error);
    });
    
    // Return the response immediately
    return NextResponse.json(response);
  } catch (error) {
    console.error('[CHAT API] Error in chat endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
} 