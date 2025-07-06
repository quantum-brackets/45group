
'use server';

import fs from 'fs/promises';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'debug.log');

export async function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;

  try {
    // This will create the file if it doesn't exist, and append to it if it does.
    await fs.appendFile(logFilePath, logMessage);
  } catch (error) {
    // Fallback to console if file logging fails for any reason
    console.error('Failed to write to log file:', error);
    console.log(logMessage);
  }
}
