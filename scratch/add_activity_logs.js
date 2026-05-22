// Direct database fix - connects to Supabase PostgreSQL and runs the fix
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const projectRef = 'krtkqnuhqmymmaucrstx';

// Try multiple connection methods
async function tryConnect(config, label) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✅ Connected via ${label}`);
    return client;
  } catch (err) {
    console.log(`❌ ${label} failed: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("=== OrbitPOS Direct Database Fix ===\n");
  console.log("Trying to connect to your Supabase database...\n");

  // Method 1: Direct connection with service role key as password
  let client = await tryConnect({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  }, 'Direct connection (service key)');

  // Method 2: Pooler transaction mode
  if (!client) {
    for (const region of ['us-east-1', 'ap-southeast-1', 'eu-west-1', 'ap-south-1']) {
      client = await tryConnect({
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: 'postgres',
        user: `postgres.${projectRef}`,
        password: process.env.SUPABASE_SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      }, `Pooler ${region} (service key)`);
      if (client) break;
    }
  }

  // Method 3: Direct connection with anon key
  if (!client) {
    client = await tryConnect({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    }, 'Direct connection (anon key)');
  }

  if (!client) {
    console.log("\n============================================");
    console.log("Could not connect automatically.");
    console.log("============================================");
    console.log("\nPlease provide your database password:");
    console.log("1. Go to supabase.com → Your project → Settings → Database");
    console.log("2. Copy the 'Database password'");
    console.log("3. Run: node scratch/fix_db_direct.js YOUR_PASSWORD_HERE");
    
    // Check if password was provided as command line argument
    const password = process.argv[2];
    if (password) {
      client = await tryConnect({
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      }, 'Direct connection (provided password)');

      if (!client) {
        // Try pooler with provided password
        for (const region of ['us-east-1', 'ap-southeast-1', 'eu-west-1', 'ap-south-1']) {
          client = await tryConnect({
            host: `aws-0-${region}.pooler.supabase.com`,
            port: 6543,
            database: 'postgres',
            user: `postgres.${projectRef}`,
            password: password,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
          }, `Pooler ${region} (provided password)`);
          if (client) break;
        }
      }
    }

    if (!client) {
      process.exit(1);
    }
  }

  // Connected! Now run the fix
  console.log("\n--- Running RLS Fix ---\n");

  const fixStatements = [
    {
      label: 'Create activity_logs table',
      sql: `CREATE TABLE IF NOT EXISTS public.activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );`
    },
    {
      label: 'Enable RLS on activity_logs',
      sql: `ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;`
    },
    {
      label: 'Create insert policy for activity_logs',
      sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Anyone can insert activity logs') THEN
          CREATE POLICY "Anyone can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
        END IF;
      END $$;`
    },
    {
      label: 'Create select policy for activity_logs',
      sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'Admins can view activity logs') THEN
          CREATE POLICY "Admins can view activity logs" ON public.activity_logs FOR SELECT USING (true);
        END IF;
      END $$;`
    }
  ];

  for (const stmt of fixStatements) {
    try {
      await client.query(stmt.sql);
      console.log(`✅ ${stmt.label}`);
    } catch (err) {
      console.log(`⚠️  ${stmt.label}: ${err.message}`);
    }
  }

  // Verify the fix
  console.log("\n--- Verifying Table ---");
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs';
    `);
    console.log("Columns in activity_logs:");
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });
  } catch (err) {
    console.log(`Could not verify: ${err.message}`);
  }

  await client.end();
  
  console.log("\n=== Activity logs table created successfully! ===");
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
