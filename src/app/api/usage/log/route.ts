import { NextRequest, NextResponse } from 'next/server';
import { appendLog } from '@/utils/logger/usageLogger';

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