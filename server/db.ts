// Production database connection
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Parse MYSQL_DATABASE_URL or use individual env vars
function createConnectionConfig() {
  const mysqlUrl = process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL;
  
  if (mysqlUrl) {
    // Parse the MySQL URL
    const url = new URL(mysqlUrl);
    const config: mysql.PoolOptions = {
      host: url.hostname,
      port: parseInt(url.port || '3306'),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    const urlCharset = url.searchParams.get('charset') || undefined;
    const configuredCharset = process.env.DB_CHARSET || urlCharset || 'utf8mb4';
    config.charset = normalizeCharset(configuredCharset);
    
    // Handle SSL configuration
    if (url.searchParams.get('ssl-mode') === 'DISABLED') {
      // Explicitly disable SSL
      config.ssl = false;
      console.log('❌ SSL disabled for MySQL connection');
    } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      // For localhost, disable SSL by default
      config.ssl = false;
      console.log('🏠 SSL disabled for localhost connection');
    } else {
      // Add SSL for remote connections
      const caPath = path.join(process.cwd(), 'ca.pem');
      if (fs.existsSync(caPath)) {
        config.ssl = {
          ca: fs.readFileSync(caPath),
          rejectUnauthorized: true,
        };
        console.log('📜 Using SSL certificate for MySQL connection');
      } else if (url.searchParams.get('ssl-mode') === 'REQUIRED') {
        // Use default SSL without custom CA
        config.ssl = {
          rejectUnauthorized: false,
        };
        console.log('🔒 Using SSL without custom CA');
      } else {
        // For remote connections, disable SSL verification for self-signed certificates
        config.ssl = {
          rejectUnauthorized: false,
        };
        console.log('🔒 Using SSL with disabled certificate verification');
      }
    }
    
    return config;
  }
  
  // Fallback to individual env vars
  const host = process.env.DB_HOST || 'localhost';
  const config: mysql.PoolOptions = {
    host,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  const fallbackCharset = process.env.DB_CHARSET || 'utf8mb4';
  config.charset = normalizeCharset(fallbackCharset);
  
  // Handle SSL for non-local connections
  if (host !== 'localhost' && host !== '127.0.0.1') {
    config.ssl = {
      rejectUnauthorized: false,
    };
    console.log('🔒 Using SSL with disabled certificate verification for', host);
  }
  
  return config;
}

function normalizeCharset(charset: string) {
  const normalized = charset.toLowerCase();
  if (normalized === 'cesu8' || normalized === 'cesu-8') {
    return 'utf8mb4';
  }
  return charset;
}

// Default to real DB even in tests; allow opting into stubs via USE_DB_STUBS=true
const isTest = process.env.NODE_ENV === 'test';
const useDbStubs = process.env.USE_DB_STUBS === 'true';

let connection: mysql.Pool;
let db: any;

if (isTest && useDbStubs) {
  console.log('🧪 Test mode: using in-memory stubs for db');

  // Minimal no-op implementations that satisfy the call sites used in tests
  connection = {
    getConnection: async () => ({ release() {} }),
  } as unknown as mysql.Pool;

  db = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [] }),
      }),
    }),
    insert: () => ({ values: async () => ({}) }),
    update: () => ({ set: () => ({ where: async () => ({}) }) }),
  };
} else {
  // Create production connection pool
  connection = mysql.createPool(createConnectionConfig());
  db = drizzle(connection);

  if (!isTest) {
    // Test connection on startup and run migrations
    connection.getConnection()
      .then(async (conn) => {
        console.log('✅ Database connected successfully');
        
        // Run migrations - add profile_image column if not exists
        try {
          await conn.query(`
            ALTER TABLE users ADD COLUMN profile_image TEXT DEFAULT NULL
          `);
          console.log('✅ Added profile_image column to users table');
        } catch (err: any) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ profile_image column already exists');
          } else {
            console.log('ℹ️ Migration note:', err.message);
          }
        }

        try {
          await conn.query(`
            ALTER TABLE users ADD COLUMN bank_account TEXT DEFAULT NULL
          `);
          console.log('✅ Added bank_account column to users table');
        } catch (err: any) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ bank_account column already exists');
          } else {
            console.log('ℹ️ Migration note:', err.message);
          }
        }
        
        conn.release();
      })
      .catch((err) => {
        console.error('❌ Database connection failed:', err.message);
      });
  }
}

async function ensureColumn(
  conn: mysql.PoolConnection,
  tableName: string,
  columnName: string,
  addSql: string,
) {
  const [rows] = await conn.query(
    `
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    [tableName, columnName],
  );

  const count = Array.isArray(rows) ? (rows[0] as any)?.count : 0;
  if (!count) {
    await conn.query(addSql);
  }
}

export async function ensureTestSchema() {
  if (useDbStubs) {
    return;
  }

  const conn = await connection.getConnection();
  try {
    await ensureColumn(
      conn,
      'users',
      'profile_image',
      'ALTER TABLE users ADD COLUMN profile_image TEXT DEFAULT NULL',
    );
    await ensureColumn(
      conn,
      'users',
      'stripe_account_id',
      'ALTER TABLE users ADD COLUMN stripe_account_id TEXT DEFAULT NULL',
    );
    await ensureColumn(
      conn,
      'users',
      'bank_account',
      'ALTER TABLE users ADD COLUMN bank_account TEXT DEFAULT NULL',
    );
  } finally {
    conn.release();
  }
}

export { db, connection };
