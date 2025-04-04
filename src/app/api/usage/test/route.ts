import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { createPool } from '@vercel/postgres';

// Initialize database connection
const pool = process.env.POSTGRES_URL 
  ? createPool({ connectionString: process.env.POSTGRES_URL })
  : new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: NextRequest) {
  console.log('[TEST API] Testing database connection');
  try {
    // Test database connection
    const testResult = await pool.query('SELECT NOW() as time');
    
    // Return database connection status
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      time: testResult.rows[0].time,
      dbConfig: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        connectionActive: true
      }
    });
  } catch (error) {
    console.error('[TEST API] Database connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: (error as Error).message,
      dbConfig: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        connectionActive: false
      }
    }, { status: 500 });
  }
} 