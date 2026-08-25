import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Create postgres connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// For query purposes
const queryClient = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema for use in other files
export * from './schema';

// Test connection
export const testConnection = async () => {
  try {
    await queryClient`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};
