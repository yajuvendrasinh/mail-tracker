const DEFAULT_PORTAL_URL = "https://mail-tracker-ten.vercel.app";

// Handle startup migration to ensure settings are always correct
chrome.runtime.onStartup.addListener(migrateSettings);
chrome.runtime.onInstalled.addListener(migrateSettings);

function migrateSettings() {
  chrome.storage.local.get(["portalUrl"], (data) => {
    const currentUrl = data.portalUrl;
    // Migrate if it's currently localhost, placeholder, or not set
    if (!currentUrl || currentUrl.includes("localhost") || currentUrl.includes("placeholder")) {
      chrome.storage.local.set({ 
        trackingEnabled: true,
        portalUrl: DEFAULT_PORTAL_URL
      });
      console.log(`Settings migrated to: ${DEFAULT_PORTAL_URL}`);
    }
  });
}

// Also run migration immediately in case neither event fired recently
migrateSettings();

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateId") {
    // Call the Portal API to get a new tracking ID
    handleGenerateId(request.data)
      .then(id => sendResponse({ success: true, id }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === "getSettings") {
    chrome.storage.local.get(["trackingEnabled", "portalUrl"], (data) => {
      sendResponse(data);
    });
    return true;
  }
});

async function handleGenerateId(data) {
    const { portalUrl } = await chrome.storage.local.get("portalUrl");
  // Clean URL: remove any trailing slashes to avoid //api/...
  const baseUrl = (portalUrl || DEFAULT_PORTAL_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/api/generate-id`;

  console.log(`[Extension] Fetching tracking ID from: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: data.id || null,
      subject: data.subject,
      recipient: data.recipient,
      user_id: data.userId || null
    }),
  });

  if (!response.ok) {
    throw new Error(`Portal error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.id;
}
