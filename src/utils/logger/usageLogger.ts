import fs from 'node:fs';
import path from 'node:path';
import { promises as fsPromises } from 'node:fs';

// Define log directory
const LOGS_DIR = process.env.USAGE_LOGS_DIR || path.join(process.cwd(), 'data', 'usage-logs');

// Function to append log entry
export async function appendLog(userId: string, data: any) {
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