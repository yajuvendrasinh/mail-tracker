-- 1. Table to store the email metadata
CREATE TABLE IF NOT EXISTS tracked_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT,
  recipient TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID, -- Optional: if you want to link this to a login
  sender_ip TEXT -- Added to automatically ignore sender's own opens
);

-- 2. Table to store every "Open" event
CREATE TABLE IF NOT EXISTS email_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES tracked_emails(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  city TEXT,
  country TEXT,
  region TEXT,
  user_agent TEXT,
  is_proxy BOOLEAN DEFAULT FALSE -- To flag if it's a Gmail/Apple proxy
);
