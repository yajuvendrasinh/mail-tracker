import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmails() {
  const { data, count } = await supabase
    .from('tracked_emails')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`Total count: ${count}`);
  console.table(data);
}

checkEmails();
