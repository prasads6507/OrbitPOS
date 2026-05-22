const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProfiles() {
  const { data: stores, error: storesError } = await supabase.from('stores').select('id, company_id');
  if (storesError) {
    console.error('Error fetching stores:', storesError);
    return;
  }

  for (const store of stores) {
    if (store.company_id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ company_id: store.company_id })
        .eq('store_id', store.id);
        
      if (updateError) {
        console.error(`Error updating profiles for store ${store.id}:`, updateError);
      } else {
        console.log(`Updated profiles for store ${store.id} to company ${store.company_id}`);
      }
    }
  }
  console.log('Done!');
}

fixProfiles();
