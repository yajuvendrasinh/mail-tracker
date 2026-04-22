'use client';

import { useEffect } from 'react';

export function SenderTag() {
  useEffect(() => {
    // Set a long-lived cookie to identify this device as a "Sender"
    // This runs only in the browser, so it's safe and doesn't break SSR.
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 10);
    
    document.cookie = `is_sender=true; expires=${expiry.toUTCString()}; path=/; SameSite=None; Secure`;
    
    console.log("[Tracker] Device tagged as sender.");
  }, []);

  return null; // This component doesn't render anything
}
