/**
 * Neon Cloud Backend Services Integration
 * Supports Lakebase Postgres, Neon Auth, Object Storage, Functions, and Realtime.
 */

import { Pool } from 'pg';
import { neon, neonConfig } from '@neondatabase/serverless';

export interface NeonServiceStatus {
  postgres: {
    configured: boolean;
    connectionType: 'pooled' | 'direct' | 'unconfigured';
    connected: boolean;
    version?: string;
    latencyMs?: number;
    error?: string;
  };
  auth: {
    configured: boolean;
    provider: string;
    authUrl?: string;
  };
  objectStorage: {
    configured: boolean;
    bucket: string;
    endpoint?: string;
  };
  functions: {
    configured: boolean;
    endpoint?: string;
    helloFunctionStatus: 'declared' | 'deployed' | 'unconfigured';
  };
  realtime: {
    configured: boolean;
    channelStatus: 'active' | 'pending';
  };
}

class NeonServiceManager {
  private pool: Pool | null = null;
  private sqlClient: any = null;

  constructor() {
    this.initDatabase();
  }

  public initDatabase() {
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
    if (dbUrl) {
      try {
        const isPooled = dbUrl.includes('-pooler');
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: { rejectUnauthorized: false }
        });
        this.sqlClient = neon(dbUrl);
        console.log(`[Neon] Database client initialized (${isPooled ? 'Pooled' : 'Direct'})`);
      } catch (err) {
        console.warn('[Neon] Database initialization deferred:', err);
      }
    }
  }

  /**
   * Run verification check across all Neon services
   */
  public async getServicesStatus(): Promise<NeonServiceStatus> {
    const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
    const authUrl = process.env.NEON_AUTH_URL || process.env.BETTER_AUTH_URL;
    const s3Endpoint = process.env.NEON_OBJECT_STORAGE_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3;
    const functionsUrl = process.env.NEON_FUNCTIONS_URL;
    const realtimeUrl = process.env.NEON_REALTIME_URL;

    const status: NeonServiceStatus = {
      postgres: {
        configured: !!dbUrl,
        connectionType: dbUrl ? (dbUrl.includes('-pooler') ? 'pooled' : 'direct') : 'unconfigured',
        connected: false
      },
      auth: {
        configured: !!authUrl,
        provider: 'Managed Better Auth (@neon/auth)',
        authUrl: authUrl || undefined
      },
      objectStorage: {
        configured: !!s3Endpoint,
        bucket: 'assets (private)',
        endpoint: s3Endpoint || undefined
      },
      functions: {
        configured: !!functionsUrl,
        endpoint: functionsUrl || undefined,
        helloFunctionStatus: 'declared'
      },
      realtime: {
        configured: !!realtimeUrl,
        channelStatus: realtimeUrl ? 'active' : 'pending'
      }
    };

    // Verify Postgres connection if URL exists
    if (dbUrl) {
      const startTime = Date.now();
      try {
        if (!this.pool) this.initDatabase();
        if (this.pool) {
          const res = await this.pool.query('SELECT version(), current_database(), current_user;');
          status.postgres.connected = true;
          status.postgres.latencyMs = Date.now() - startTime;
          status.postgres.version = res.rows[0]?.version?.split(' ')?.[1] || 'PostgreSQL 16';
        }
      } catch (e: any) {
        status.postgres.connected = false;
        status.postgres.error = e.message || 'Connection test failed';
      }
    }

    return status;
  }

  /**
   * Execute raw SQL verification query (e.g., test double-entry ledger balance or partition status)
   */
  public async executeVerificationQuery(sqlStatement: string = 'SELECT 1 as connected;'): Promise<any> {
    if (!this.pool) {
      throw new Error('Neon database connection not configured. Pull DATABASE_URL via neon deploy / neon env pull.');
    }
    const start = Date.now();
    const result = await this.pool.query(sqlStatement);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      durationMs: Date.now() - start
    };
  }
}

export const neonService = new NeonServiceManager();
