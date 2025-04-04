import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { createPool } from '@vercel/postgres';
import { appendLog } from '@/utils/logger/usageLogger';

// Initialize database connection
const DATABASE_URL = process.env.DATABASE_URL || '';
const POSTGRES_URL = process.env.POSTGRES_URL || '';

let pool: any;
try {
  if (POSTGRES_URL) {
    pool = createPool({ connectionString: POSTGRES_URL });
  } else if (DATABASE_URL) {
    pool = new Pool({ connectionString: DATABASE_URL });
  } else {
    pool = null;
  }
} catch (error) {
  console.error('[DEBUG API] Failed to initialize database connection:', error);
  pool = null;
}

export async function GET(req: NextRequest) {
  console.log('[DEBUG API] Running diagnostics on usage tracking system');
  
  const results: any = {
    environment: {
      node_env: process.env.NODE_ENV,
      has_database_url: !!DATABASE_URL,
      has_postgres_url: !!POSTGRES_URL,
      database_connection_initialized: !!pool
    },
    tests: {}
  };
  
  // Test 1: Database connection
  try {
    console.log('[DEBUG API] Testing database connection');
    if (!pool) {
      results.tests.database_connection = {
        status: 'failed',
        error: 'No database connection initialized'
      };
    } else {
      const testResult = await pool.query('SELECT NOW() as time');
      results.tests.database_connection = {
        status: 'success',
        time: testResult.rows[0].time
      };
    }
  } catch (error) {
    results.tests.database_connection = {
      status: 'failed',
      error: (error as Error).message
    };
  }
  
  // Test 2: Table exists
  try {
    console.log('[DEBUG API] Testing if usage_logs table exists');
    if (!results.tests.database_connection || results.tests.database_connection.status === 'failed') {
      results.tests.table_exists = {
        status: 'skipped',
        message: 'Database connection failed'
      };
    } else {
      const tableResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'usage_logs'
        ) as exists
      `);
      
      const tableExists = tableResult.rows[0].exists;
      results.tests.table_exists = {
        status: tableExists ? 'success' : 'failed',
        exists: tableExists
      };
      
      if (tableExists) {
        // Get table structure
        const columnsResult = await pool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'usage_logs'
        `);
        
        results.tests.table_structure = {
          status: 'success',
          columns: columnsResult.rows
        };
        
        // Get record count
        const countResult = await pool.query('SELECT COUNT(*) as count FROM usage_logs');
        results.tests.record_count = {
          status: 'success',
          count: parseInt(countResult.rows[0].count)
        };
      }
    }
  } catch (error) {
    results.tests.table_exists = {
      status: 'failed',
      error: (error as Error).message
    };
  }
  
  // Test 3: Insert test record
  try {
    console.log('[DEBUG API] Testing record insertion');
    if (!results.tests.table_exists || results.tests.table_exists.status !== 'success') {
      results.tests.insert_record = {
        status: 'skipped',
        message: 'Table does not exist'
      };
    } else {
      const testUserId = 'debug-test-user';
      const testData = {
        type: 'debug-test',
        model: 'test-model',
        provider: 'test-provider',
        totalTokens: 123
      };
      
      const insertResult = await appendLog(testUserId, testData);
      
      results.tests.insert_record = {
        status: insertResult ? 'success' : 'failed',
        result: insertResult
      };
      
      // Verify insertion
      if (insertResult) {
        const verifyResult = await pool.query(
          'SELECT COUNT(*) as count FROM usage_logs WHERE user_id = $1 AND type = $2',
          [testUserId, 'debug-test']
        );
        
        results.tests.verify_insertion = {
          status: 'success',
          count: parseInt(verifyResult.rows[0].count)
        };
      }
    }
  } catch (error) {
    results.tests.insert_record = {
      status: 'failed',
      error: (error as Error).message
    };
  }
  
  // Return all test results
  return NextResponse.json(results);
} 