import { NextRequest, NextResponse } from 'next/server';
import { appendLog } from '@/middleware/usage-tracking';

// Define interface for the tool_calls
interface ToolCall {
  id: string;
  type: string;
  function?: {
    name: string;
    arguments: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const requestBody = await req.json();

    // Extract user ID from headers or cookies
    const userId = req.headers.get('x-user-id') || 
                   req.cookies.get('user_id')?.value || 
                   'anonymous';

    // TODO: This is where you would call your existing chat completion function
    // For now, we'll just use this placeholder for testing the usage tracking
    
    // Call your existing chat API
    // For example: const response = await yourChatCompletionFunction(requestBody);
    
    // Mock response for testing
    const response = {
      id: 'mock-response-id',
      model: requestBody.model,
      provider: requestBody.provider,
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      },
      choices: [
        {
          message: {
            content: "This is a test response for usage tracking."
          }
        }
      ],
      // Mock tool calls for testing
      tool_calls: [] as ToolCall[]
    };

    // Track completion usage
    try {
      // Create completion log entry
      const completionData = {
        type: 'completion',
        userId,
        model: requestBody.model,
        provider: requestBody.provider || 'unknown',
        messageId: requestBody.messageId,
        sessionId: requestBody.sessionId,
        inputTokens: response.usage.prompt_tokens || 0,
        outputTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0
      };
      
      // Log completion data
      appendLog(userId, completionData);
      
      // Also track tool usage if any
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const tool of response.tool_calls) {
          const toolLogEntry = {
            type: 'tool',
            userId,
            toolName: tool.function?.name || 'unknown',
            messageId: requestBody.messageId,
            sessionId: requestBody.sessionId
          };
          
          appendLog(userId, toolLogEntry);
        }
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to log completion usage data:', error);
    }

    // Return the response
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 