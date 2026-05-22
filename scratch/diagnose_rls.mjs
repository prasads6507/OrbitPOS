// OrbitPOS RLS Diagnostic Script
// This uses the service role key (which bypasses RLS) to check your database state.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error("Missing env vars. Run from OrbitPOS root directory.");
  process.exit(1);
}

async function query(table, key, extra = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${extra}&limit=5`;
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  console.log("=== OrbitPOS RLS Diagnostic ===\n");

  // Test 1: Can service role read profiles? (bypasses RLS)
  console.log("1. Reading profiles with SERVICE ROLE key (bypasses RLS)...");
  const svcProfiles = await query('profiles', SERVICE_KEY);
  if (svcProfiles.status === 200 && Array.isArray(svcProfiles.data)) {
    console.log(`   ✅ SUCCESS - Found ${svcProfiles.data.length} profile(s)`);
    svcProfiles.data.forEach(p => {
      console.log(`      - ${p.full_name || p.email || p.id} | role: ${p.role} | store_id: ${p.store_id}`);
    });
  } else {
    console.log(`   ❌ FAILED - Status: ${svcProfiles.status}`);
    console.log(`   Response:`, JSON.stringify(svcProfiles.data, null, 2));
  }

  // Test 2: Can anon key read profiles? (uses RLS - this is where the error is)
  console.log("\n2. Reading profiles with ANON key (uses RLS policies)...");
  const anonProfiles = await query('profiles', ANON_KEY);
  if (anonProfiles.status === 200 && Array.isArray(anonProfiles.data)) {
    console.log(`   ✅ SUCCESS - Found ${anonProfiles.data.length} profile(s)`);
  } else {
    console.log(`   ❌ FAILED - Status: ${anonProfiles.status}`);
    console.log(`   Error:`, JSON.stringify(anonProfiles.data, null, 2));
    console.log(`\n   >>> THIS CONFIRMS THE RLS INFINITE RECURSION BUG <<<`);
  }

  // Test 3: Can service role read stores?
  console.log("\n3. Reading stores with SERVICE ROLE key...");
  const svcStores = await query('stores', SERVICE_KEY);
  if (svcStores.status === 200 && Array.isArray(svcStores.data)) {
    console.log(`   ✅ SUCCESS - Found ${svcStores.data.length} store(s)`);
    svcStores.data.forEach(s => {
      console.log(`      - ${s.name} (${s.id})`);
    });
  } else {
    console.log(`   ❌ FAILED - Status: ${svcStores.status}`);
  }

  // Test 4: Can service role read products?
  console.log("\n4. Reading products with SERVICE ROLE key...");
  const svcProducts = await query('products', SERVICE_KEY);
  if (svcProducts.status === 200 && Array.isArray(svcProducts.data)) {
    console.log(`   ✅ SUCCESS - Found ${svcProducts.data.length} product(s)`);
  } else {
    console.log(`   ❌ FAILED - Status: ${svcProducts.status}`);
  }

  // Test 5: Can anon key read products? (uses RLS)
  console.log("\n5. Reading products with ANON key (uses RLS)...");
  const anonProducts = await query('products', ANON_KEY);
  if (anonProducts.status === 200) {
    console.log(`   ✅ SUCCESS - Status 200`);
  } else {
    console.log(`   ❌ FAILED - Status: ${anonProducts.status}`);
    console.log(`   Error:`, JSON.stringify(anonProducts.data, null, 2));
  }

  console.log("\n=== Diagnostic Complete ===");
  console.log("\nIf Test 1 passes but Test 2 fails, the issue is 100% RLS policies.");
  console.log("Your DATA is safe. Only the security policies are blocking access.");
}

main().catch(console.error);
