import { NextRequest, NextResponse } from 'next/server';
import { appendLog } from '@/utils/logger/usageLogger';
import { userProfileSelectors } from '@/store/user/selectors';
import { useUserStore } from '@/store/user';

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
    // Try to get authenticated user ID from user store first (client-side state not available in edge)
    // Try from auth-specific headers (preferred as more secure)
    const authUserId = 
      req.headers.get('x-auth-user-id') ||
      req.headers.get('x-user-id') ||
      req.headers.get('x-clerk-user-id') ||
      req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (authUserId) {
      console.log(`[CHAT API] Got user ID from auth header: ${authUserId}`);
      return authUserId;
    }
    
    // Try from auth cookies
    const authCookies = [
      'auth0_user_id',
      '__clerk_db_user_id',
      'next-auth.user-id',
      'next-auth.session-token',
      'user_id'
    ];
    
    for (const cookieName of authCookies) {
      const cookieValue = req.cookies.get(cookieName)?.value;
      if (cookieValue) {
        console.log(`[CHAT API] Got user ID from ${cookieName} cookie: ${cookieValue}`);
        return cookieValue;
      }
    }
    
    // Log all cookie names to help debugging
    const cookieNames = Array.from(req.cookies.getAll()).map(c => c.name);
    console.log(`[CHAT API] Available cookies: ${cookieNames.join(', ')}`);
    
    // Look for any auth-related cookies
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.includes('auth') || cookie.name.includes('user') || cookie.name.includes('session')) {
        console.log(`[CHAT API] Found potential auth cookie: ${cookie.name} = ${cookie.value.substring(0, 10)}...`);
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