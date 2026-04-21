console.log("Gmail Tracker Injector: Content script loaded.");

const SELECTORS = {
  composeWindow: 'div[role="dialog"], div.M9', // M9 is another common compose class
  toolbar: '.btC', // Gmail's toolbar container
  sendButton: 'div[role="button"][data-tooltip*="Send"], .aoO, .T-I.J-J5-Ji.aoO.v7.T-I-atl.L3',
  messageBody: 'div[aria-label="Message Body"]',
  subjectInput: 'input[name="subjectbox"]',
  recipientInput: 'input[name="to"]',
};

// Map to keep track of per-window tracking IDs
const windowTrackerIds = new WeakMap();

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Global observer to watch for new compose windows
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Look for compose windows
        const composeWindows = node.querySelectorAll(SELECTORS.composeWindow);
        if (composeWindows.length > 0) {
          composeWindows.forEach(window => initializeComposeWindow(window));
        } else if (node.matches(SELECTORS.composeWindow)) {
          initializeComposeWindow(node);
        }
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });

function initializeComposeWindow(composeWindow) {
  // Prevent duplicate injection
  if (composeWindow.querySelector('.mt-tracker-toggle-container')) return;

  const toolbar = composeWindow.querySelector(SELECTORS.toolbar);
  if (!toolbar) return;

  const container = document.createElement('div');
  container.className = 'mt-tracker-toggle-container';
  container.innerHTML = `
    <label class="mt-switch">
      <input type="checkbox" id="mt-track-checkbox" checked>
      <span class="mt-slider round"></span>
    </label>
    <span class="mt-label">Track</span>
  `;

  // Insert at the start of the toolbar
  toolbar.insertBefore(container, toolbar.firstChild);

  // Generate a unique ID for this specific compose window
  const trackingId = generateUUID();
  windowTrackerIds.set(composeWindow, trackingId);
  console.log("Gmail Tracker: Assigned tracking ID", trackingId);

  // PRE-INJECT the pixel immediately!
  // This avoids the race condition of fetching after clicking Send.
  injectPixel(composeWindow, trackingId);

  // Hook into the send button
  const attachSendListener = () => {
    const sendButton = composeWindow.querySelector(SELECTORS.sendButton);
    if (sendButton) {
      // Use capture: true to ensure we get the event before Gmail's internal handlers
      sendButton.addEventListener('mousedown', () => handleSend(composeWindow), true);
      sendButton.addEventListener('click', () => handleSend(composeWindow), true);
      console.log("Gmail Tracker: Send listeners attached (Capture Phase).");
    } else {
      setTimeout(attachSendListener, 1000);
    }
  };
  attachSendListener();

  // Also listen for keyboard shortcuts within this compose window
  composeWindow.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      console.log("Gmail Tracker: Send shortcut detected.");
      handleSend(composeWindow);
    }
  }, true);
}

async function handleSend(composeWindow) {
  // Prevent double-sending for the same window session
  if (composeWindow.dataset.mtSent === 'true') return;
  
  const isTrackEnabled = composeWindow.querySelector('#mt-track-checkbox')?.checked;
  const trackingId = windowTrackerIds.get(composeWindow);
  
  if (isTrackEnabled === false || !trackingId) {
      console.log("Gmail Tracker: Tracking disabled or no ID.");
      return;
  }

  // Mark as sent to avoid double registration
  composeWindow.dataset.mtSent = 'true';
  console.log("Gmail Tracker: Send detected. Registering metadata for ID:", trackingId);

  // 1. Scraping metadata
  const subject = composeWindow.querySelector(SELECTORS.subjectInput)?.value || "No Subject";
  
  let recipient = "Unknown Recipient";
  const recipientField = composeWindow.querySelector('input[name="to"]');
  if (recipientField && recipientField.value) {
      recipient = recipientField.value;
  } else {
      const emails = composeWindow.querySelectorAll('[email]');
      if (emails.length > 0) {
          recipient = Array.from(emails).map(e => e.getAttribute('email')).join(', ');
      }
  }

  // 2. Tell background script to "Register" this ID with metadata
  chrome.runtime.sendMessage({ 
    action: "generateId", 
    data: { 
        id: trackingId,
        subject, 
        recipient 
    } 
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Gmail Tracker: Runtime error during registration:", chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log("Gmail Tracker: Successfully registered metadata for ID:", trackingId);
    } else {
      console.error("Gmail Tracker: Registration failed:", response?.error);
    }
  });
}

function injectPixel(composeWindow, id) {
  const body = composeWindow.querySelector(SELECTORS.messageBody);
  if (!body) {
      console.warn("Gmail Tracker: Could not find message body to inject pixel.");
      return;
  }

  chrome.runtime.sendMessage({ action: "getSettings" }, (settings) => {
    const portalUrl = settings.portalUrl || "https://mail-tracker-ten.vercel.app";
    const trackUrl = `${portalUrl}/api/track/${id}?t=${Date.now()}`;
    
    // Check if already injected to be safe
    if (body.querySelector(`img[data-tracker-id="${id}"]`)) return;

    const pixelHtml = `<img src="${trackUrl}" width="1" height="1" style="display:none !important;" data-tracker-id="${id}" />`;
    
    // Append to the end of the body
    body.insertAdjacentHTML('beforeend', pixelHtml);
    console.log("Gmail Tracker: Pixel pre-injected.", id);
  });
}

