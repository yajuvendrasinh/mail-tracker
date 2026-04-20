console.log("Gmail Tracker Injector: Content script loaded.");

const SELECTORS = {
  composeWindow: 'div[role="dialog"]',
  toolbar: '.btC', // Gmail's toolbar container
  sendButton: '.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3', // Main send button
  messageBody: 'div[aria-label="Message Body"]',
  subjectInput: 'input[name="subjectbox"]',
  recipientInput: 'input[name="to"]', // Simplified, might need more robust selector
};

// Global observer to watch for new compose windows
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Look for compose windows
        const composeWindows = node.querySelectorAll(SELECTORS.composeWindow);
        if (composeWindows.length > 0) {
          composeWindows.forEach(window => injectTrackerToggle(window));
        } else if (node.matches(SELECTORS.composeWindow)) {
          injectTrackerToggle(node);
        }
      }
    });
  });
});

observer.observe(document.body, { childList: true, subtree: true });

function injectTrackerToggle(composeWindow) {
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

  // Insert before the send button or at the start of the toolbar
  toolbar.insertBefore(container, toolbar.firstChild);

  // Hook into the send button
  const sendButton = composeWindow.querySelector(SELECTORS.sendButton);
  if (sendButton) {
    sendButton.addEventListener('click', () => handleSend(composeWindow));
  }
}

async function handleSend(composeWindow) {
  const isTrackEnabled = composeWindow.querySelector('#mt-track-checkbox').checked;
  if (!isTrackEnabled) return;

  console.log("Gmail Tracker: Preparing hit...");

  // 1. Scraping metadata
  const subject = composeWindow.querySelector(SELECTORS.subjectInput)?.value || "No Subject";
  
  // Recipient scraping is tricky in Gmail; usually in multiple hidden elements or a wrapper
  let recipient = "Unknown Recipient";
  const recipientField = composeWindow.querySelector('input[name="to"]');
  if (recipientField) {
      recipient = recipientField.value;
  } else {
      // Fallback: search for elements with email addresses
      const emails = composeWindow.querySelectorAll('[email]');
      if (emails.length > 0) {
          recipient = emails[0].getAttribute('email');
      }
  }

  // 2. Request unique ID from background script
  chrome.runtime.sendMessage({ 
    action: "generateId", 
    data: { subject, recipient } 
  }, (response) => {
    if (response && response.success) {
      injectPixel(composeWindow, response.id);
    } else {
      console.error("Gmail Tracker: Failed to generate ID", response?.error);
    }
  });
}

async function injectPixel(composeWindow, id) {
  const body = composeWindow.querySelector(SELECTORS.messageBody);
  if (!body) return;

  chrome.runtime.sendMessage({ action: "getSettings" }, (settings) => {
    const portalUrl = settings.portalUrl || "http://localhost:3000";
    const trackUrl = `${portalUrl}/api/track/${id}?t=${Date.now()}`;
    
    const pixelHtml = `<img src="${trackUrl}" width="1" height="1" style="display:none !important;" data-tracker-id="${id}" />`;
    
    // Append to the end of the body without destroying listeners
    body.insertAdjacentHTML('beforeend', pixelHtml);
    console.log("Gmail Tracker: Pixel injected.", id);
  });
}
