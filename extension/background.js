const DEFAULT_PORTAL_URL = "http://localhost:3000";

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    trackingEnabled: true,
    portalUrl: DEFAULT_PORTAL_URL
  });
  console.log("Gmail Tracker Injector installed.");
});

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
  const url = portalUrl || DEFAULT_PORTAL_URL;

  const response = await fetch(`${url}/api/generate-id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
