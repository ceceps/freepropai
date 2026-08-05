import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

// Create postgres connection
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// For query purposes
const queryClient = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema for use in other files
export * from './schema';

// Test connection and ensure migrations/columns
export const testConnection = async () => {
  try {
    await queryClient`SELECT 1`;
    // Ensure is_featured column exists on listing_photos table
    await queryClient`ALTER TABLE listing_photos ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};
