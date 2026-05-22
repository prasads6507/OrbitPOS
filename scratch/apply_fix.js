// OrbitPOS Emergency Fix - Runs directly from your terminal
// Uses the Supabase service role key to fix RLS policies via the management API

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runSQL(label, sql) {
  console.log(`\n[${label}]`);
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // If exec_sql doesn't exist, we'll create it first
    console.log(`   Result: ${error.message}`);
    return false;
  }
  console.log(`   ✅ Success`);
  return true;
}

async function main() {
  console.log("=== OrbitPOS Emergency RLS Fix ===\n");

  // Step 1: Try to create a helper function that can execute SQL
  // We use the REST API to create an RPC function first
  console.log("Step 1: Creating SQL executor function...");
  
  const createExecRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_text: 'SELECT 1' })
  });

  if (createExecRes.status !== 200) {
    console.log("   exec_sql function doesn't exist. Creating it via alternative method...\n");
    
    // We need to use the Supabase SQL endpoint directly
    // Supabase exposes a /pg endpoint for the service role
    const sqlStatements = [
      {
        label: "Create exec_sql helper function",
        sql: `CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT) RETURNS TEXT AS $fn$
BEGIN
  EXECUTE sql_text;
  RETURN 'OK';
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;`
      }
    ];

    // Try the query endpoint
    const queryRes = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log("   Cannot create functions via REST API.");
    console.log("   Trying alternative approach...\n");
  } else {
    console.log("   ✅ exec_sql function exists!");
  }

  // Alternative approach: Use Supabase's built-in pg_dump/restore or 
  // try to modify policies through the PostgREST API
  
  // Actually, the most reliable approach: use the Supabase Management API
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  
  console.log(`Project ref: ${projectRef}`);
  console.log("\n--- Attempting direct SQL via Supabase API ---\n");

  // Try the /sql endpoint (available in newer Supabase versions)
  const fixSQL = `
    -- Restore the viewable-by-everyone policy on profiles
    DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
    CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
    
    -- Ensure INSERT and UPDATE policies exist
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;  
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

    -- Fix function ownership
    ALTER FUNCTION public.current_user_store_id() OWNER TO postgres;
    GRANT EXECUTE ON FUNCTION public.current_user_store_id() TO PUBLIC;
  `;

  // Method 1: Try /pg/query endpoint
  for (const endpoint of ['/pg/query', '/rest/v1/rpc/exec_sql']) {
    try {
      const res = await fetch(`${supabaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'x-connection-encrypted': 'true'
        },
        body: JSON.stringify(endpoint.includes('rpc') ? { sql_text: fixSQL } : { query: fixSQL })
      });
      const body = await res.text();
      console.log(`Endpoint ${endpoint}: Status ${res.status}`);
      if (res.status === 200 || res.status === 201) {
        console.log("✅ FIX APPLIED SUCCESSFULLY!");
        
        // Verify
        const verifyRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,full_name&limit=3`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          }
        });
        if (verifyRes.status === 200) {
          console.log("✅ VERIFIED: Profiles are now accessible! Refresh your app.");
        } else {
          console.log("⚠️  Fix may not have worked. Status:", verifyRes.status);
        }
        return;
      } else {
        console.log(`   Response: ${body.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`Endpoint ${endpoint}: ${e.message}`);
    }
  }

  // If we get here, none of the automated methods worked
  console.log("\n============================================");
  console.log("AUTOMATED FIX COULD NOT CONNECT TO SQL.");
  console.log("============================================");
  console.log("\nYou MUST run the fix manually in Supabase.");
  console.log("Here are the INDIVIDUAL statements to run ONE AT A TIME:\n");
  
  const statements = [
    `DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;`,
    `CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;`,
    `CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);`,
    `DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;`,
    `CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);`,
    `ALTER FUNCTION public.current_user_store_id() OWNER TO postgres;`,
    `GRANT EXECUTE ON FUNCTION public.current_user_store_id() TO PUBLIC;`
  ];

  statements.forEach((s, i) => {
    console.log(`--- Statement ${i + 1} ---`);
    console.log(s);
    console.log();
  });
}

main().catch(console.error);
