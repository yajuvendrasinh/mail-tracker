import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subject, recipient, user_id } = body;

    console.log(`[Generate-ID] Attempting to track for: ${recipient} | Subject: ${subject}`);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      console.error('[Generate-ID] CRITICAL: Supabase URL is not configured in Vercel environment variables!');
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from('tracked_emails')
      .insert({
        subject: subject || 'No Subject',
        recipient: recipient || 'Unknown Recipient',
        user_id: user_id || null,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
