import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOpens() {
  const targetId = '8d851554-b750-41e0-b517-09297facc2a2';
  console.log(`Checking status for Email ID: ${targetId}`);

  const { data: email, error: emailError } = await supabase
    .from('tracked_emails')
    .select('*')
    .eq('id', targetId)
    .single();

  if (emailError) {
    console.error('Error fetching email metadata:', emailError.message);
    return;
  }

  console.log('Email Metadata:');
  console.table(email);

  const { data: opens, error: opensError, count } = await supabase
    .from('email_opens')
    .select('*', { count: 'exact' })
    .eq('email_id', targetId);

  if (opensError) {
    console.error('Error fetching opens:', opensError.message);
    return;
  }

  console.log(`Open Count: ${count}`);
  console.log('Open Events:');
  console.table(opens);
}

checkOpens();
