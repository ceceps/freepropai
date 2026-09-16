import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as pipelineSchema from './pipeline.schema';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export class PipelineNotConfiguredError extends Error {
  constructor() {
    super('Pipeline database is not configured');
    this.name = 'PipelineNotConfiguredError';
  }
}

function resolveConnectionString(): string | null {
  if (process.env.PIPELINE_DATABASE_URL) {
    return process.env.PIPELINE_DATABASE_URL;
  }
  const dbName = process.env.PIPELINE_DB_NAME;
  if (!dbName) {
    return null;
  }
  const user = encodeURIComponent(process.env.DB_USER || 'postgres');
  const password = process.env.DB_PASSWORD ? `:${encodeURIComponent(process.env.DB_PASSWORD)}` : '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  return `postgresql://${user}${password}@${host}:${port}/${dbName}`;
}

export function isPipelineConfigured(): boolean {
  return resolveConnectionString() !== null;
}

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: PostgresJsDatabase<typeof pipelineSchema> | null = null;

let writeClient: ReturnType<typeof postgres> | null = null;
let writeDbInstance: PostgresJsDatabase<typeof pipelineSchema> | null = null;

/**
 * Lazily created, server-enforced read-only connection to the pipeline database.
 * `default_transaction_read_only` makes every session reject writes.
 */
export function getPipelineClient(): ReturnType<typeof postgres> {
  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new PipelineNotConfiguredError();
  }
  if (!client) {
    client = postgres(connectionString, {
      max: 4,
      idle_timeout: 20,
      connection: {
        application_name: 'freepropai-pipeline-readonly',
        default_transaction_read_only: true,
      },
    });
  }
  return client;
}

export function getPipelineDb(): PostgresJsDatabase<typeof pipelineSchema> {
  if (!dbInstance) {
    dbInstance = drizzle(getPipelineClient(), { schema: pipelineSchema });
  }
  return dbInstance;
}

/** Writable connection to the pipeline database — use only for user-initiated writes (e.g. scheduling). */
export function getPipelineWriteDb(): PostgresJsDatabase<typeof pipelineSchema> {
  if (!writeDbInstance) {
    const connectionString = resolveConnectionString();
    if (!connectionString) throw new PipelineNotConfiguredError();
    writeClient = postgres(connectionString, {
      max: 2,
      idle_timeout: 20,
      connection: { application_name: 'freepropai-pipeline-write' },
    });
    writeDbInstance = drizzle(writeClient, { schema: pipelineSchema });
  }
  return writeDbInstance;
}

export async function testPipelineConnection(): Promise<boolean> {
  if (!isPipelineConfigured()) {
    console.warn('⚠️ Pipeline database not configured (set PIPELINE_DB_NAME or PIPELINE_DATABASE_URL)');
    return false;
  }
  try {
    await getPipelineClient()`SELECT 1`;
    console.log('✅ Pipeline database connection successful (read-only)');
    return true;
  } catch (error) {
    console.error('❌ Pipeline database connection failed:', error);
    return false;
  }
}

export * from './pipeline.schema';
