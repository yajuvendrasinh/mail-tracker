import { after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Grab Vercel's automatic Geolocation & IP headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
  
  const city = req.headers.get('x-vercel-ip-city') || 'Unknown';
  const country = req.headers.get('x-vercel-ip-country') || 'Unknown';
  const region = req.headers.get('x-vercel-ip-country-region') || 'Unknown';
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  // 2. Fetch the email metadata to get the recorded sender_ip
  const { data: emailData, error: emailError } = await supabaseAdmin
    .from('tracked_emails')
    .select('sender_ip')
    .eq('id', id)
    .single();

  if (emailError) {
    console.warn(`[Track] Could not find email meta for ID: ${id}. Proceeding with standard log.`);
  }

  // 3. Logic to ignore the sender (Self-Tracking)
  const isSender = emailData?.sender_ip === ip;
  const isLocalhost = ip === '127.0.0.1' || ip === '::1';
  const isOfficeIp = process.env.MY_OFFICE_IP && ip.includes(process.env.MY_OFFICE_IP);

  if (isSender || isOfficeIp || (process.env.NODE_ENV === 'development' && isLocalhost)) {
    console.log(`[Track] Ignored self-hit for email_id: ${id} from IP: ${ip}`);
    return new Response(PIXEL, {
      headers: { 
        'Content-Type': 'image/gif',
        'X-Tracker-Status': 'ignored',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  // 4. Log the open synchronously (Essential for Vercel Free Tier)
  const isProxy =
    userAgent.includes('GoogleImageProxy') ||
    userAgent.includes('via ggpht.com') ||
    userAgent.includes('AppleNewsProxy');

  try {
    console.log(`[Track] Logging open for email_id: ${id} from IP: ${ip}`);
    const { error } = await supabaseAdmin.from('email_opens').insert({
      email_id: id,
      ip_address: ip,
      city,
      country,
      region,
      user_agent: userAgent,
      is_proxy: isProxy,
    });
    
    if (error) {
      console.error('[Track] Supabase Insert Error:', error);
    }
  } catch (err) {
    console.error('[Track] Unexpected error:', err);
  }

  // 4. Send the response instantly with ultra-aggressive cache-busting
  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0',
      'Surrogate-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${id}-${Date.now()}"`, // Unique ETag to force a re-fetch
      'X-Tracker-Status': 'success',
    },
  });
}
