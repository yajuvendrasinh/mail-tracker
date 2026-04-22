# Changelog

All notable changes to the **Mail Tracker** project will be documented in this file.

## [v0.2] - 2026-04-22
### 🌍 Timezone & Localization
- **IST Support:** Successfully synchronized the entire stack to Indian Standard Time (IST).
- **Database Timezone:** Configured PostgreSQL to use `Asia/Kolkata` as the default timezone.
- **Literal Timestamping:** Implemented conversion of `TIMESTAMPTZ` to `TIMESTAMP WITHOUT TIME ZONE` to ensure the frontend displays exact clock time regardless of server location (UTC).
- **Frontend Fixes:** Resolved the "UTC mismatch" where Vercel servers were displaying times 5.5 hours behind.

### 🛡️ Advanced Self-Tracking Prevention (v2)
- **Browser Fingerprinting:** Added `sender_ua` tracking. The system now "memorizes" the browser used to send the email.
- **Dual-Layer Verification:** The tracking pixel now cross-references both the **IP Address** and the **User Agent**. If both match the sender, the open is ignored.
- **Sender Cookies:** Implemented a persistent `is_sender=true` cookie (10-year expiry). 
- **Dashboard Tagging:** Any device that visits the Dashboard or Email Insight page is automatically tagged as a "Sender" device, effectively silencing self-opens from that device forever.
- **Mobile Support:** Enabled a simple "Visit Dashboard" workflow to register mobile devices as "Sender" devices.

### 📊 Dashboard & UI Improvements
- **Privacy Proxy Detection:** Enhanced detection of **Google Image Proxy** and **Apple Privacy Proxy** to avoid false location data.
- **Proxy Branding:** Added specific badges for "Gmail Security Proxy" and "Apple Privacy Proxy" in the activity timeline.
- **Device Intelligence:** Added icons for Mobile, Desktop, and Proxy bots in the activity timeline.

---

## [v0.1] - 2026-04-20
### 🚀 Initial Release
- **Gmail Extension:** Built a custom Chrome extension that injects a tracking toggle and pixel into the Gmail compose window.
- **Automatic ID Generation:** Backend API to generate unique tracking IDs and register email metadata (Subject, Recipient).
- **Supabase Integration:** Real-time database storage for `tracked_emails` and `email_opens`.
- **Pixel Engine:** Ultra-lightweight 1x1 transparent GIF delivery system.

### 🛠️ Core Infrastructure
- **Vercel Deployment:** Configured Next.js API routes for production-grade tracking.
- **CORS Management:** Enabled secure communication between the Gmail domain and the tracking portal.
- **Cache Busting:** Implemented aggressive cache-busting (Unique ETags, `no-cache` headers, and `Last-Modified` timestamps) to ensure every open is caught.
- **IP Filtering (v1):** Initial implementation of sender IP filtering to prevent basic self-tracking on the same network.

### 🐞 Bug Fixes & Refinements
- Fixed Vercel build errors regarding experimental Next.js configurations.
- Sanitized Extension-to-Portal URL communications.
- Improved "Send" button detection in Gmail's dynamic UI.

---

