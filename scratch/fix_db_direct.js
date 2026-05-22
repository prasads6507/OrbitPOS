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
      label: 'Drop recursive "Users can view store members" policy',
      sql: `DROP POLICY IF EXISTS "Users can view store members" ON public.profiles;`
    },
    {
      label: 'Drop "Users can view own profile" policy',
      sql: `DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;`
    },
    {
      label: 'Drop old "Profiles are viewable by everyone" policy',
      sql: `DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;`
    },
    {
      label: 'Create simple "Profiles are viewable by everyone" policy',
      sql: `CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);`
    },
    {
      label: 'Ensure INSERT policy exists',
      sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
          CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
        END IF;
      END $$;`
    },
    {
      label: 'Ensure UPDATE policy exists',
      sql: `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
          CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
        END IF;
      END $$;`
    },
    {
      label: 'Fix current_user_store_id function ownership',
      sql: `ALTER FUNCTION public.current_user_store_id() OWNER TO postgres;`
    },
    {
      label: 'Grant execute to PUBLIC',
      sql: `GRANT EXECUTE ON FUNCTION public.current_user_store_id() TO PUBLIC;`
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
  console.log("\n--- Verifying Fix ---\n");
  try {
    const result = await client.query(`
      SELECT policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename = 'profiles'
      ORDER BY policyname;
    `);
    console.log("Current policies on profiles table:");
    result.rows.forEach(r => {
      console.log(`  - ${r.policyname} (${r.cmd}): ${r.qual}`);
    });
  } catch (err) {
    console.log(`Could not verify: ${err.message}`);
  }

  await client.end();
  
  console.log("\n=== Fix Complete! Refresh your OrbitPOS app now. ===");
}

main().catch(err => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
