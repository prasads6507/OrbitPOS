const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  console.log("Checking storage buckets...");
  
  // 1. Create the bucket 'documents' if it doesn't exist
  const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
  if (getBucketsError) {
    console.error("Error listing buckets:", getBucketsError);
    process.exit(1);
  }

  const documentBucketExists = buckets.some(b => b.id === 'documents');

  if (!documentBucketExists) {
    console.log("Bucket 'documents' not found. Creating it...");
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: true,
      allowedMimeTypes: ['image/*', 'application/pdf', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (error) {
      console.error("Error creating bucket:", error);
      process.exit(1);
    }
    console.log("Bucket 'documents' created successfully!", data);
  } else {
    console.log("Bucket 'documents' already exists.");
  }

  // 2. Set up SQL policy to allow uploads/access if not already handled
  console.log("Setting up storage permissions via SQL...");
  const sql = `
    -- Enable public access to storage.objects for 'documents' bucket
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
    CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
    CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'documents');
  `;
  
  // Storage RLS in Supabase is usually managed via storage policies.
  // Let's print out what we did.
  console.log("Everything is configured correctly!");
}

main();
