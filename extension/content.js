console.log("Gmail Tracker Injector: Content script loaded.");

const SELECTORS = {
  // More specific compose window selector
  composeWindow: 'div[role="dialog"][aria-label*="Compose"], div[role="dialog"][aria-label*="New Message"], .nH.Hd', 
  toolbar: '.btC', 
  sendButton: '[role="button"][data-tooltip*="Send"], .aoO, .T-I-atl',
  messageBody: 'div[aria-label="Message Body"], div[contenteditable="true"]',
  subjectInput: 'input[name="subjectbox"]',
  recipientInput: 'input[name="to"]',
};

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

// Utility to wait for an element within a parent
async function waitForElement(parent, selector, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = parent.querySelector(selector);
    if (el) return el;
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
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

async function initializeComposeWindow(composeWindow) {
  if (composeWindow.dataset.mtInitialized === 'true') return;
  composeWindow.dataset.mtInitialized = 'true';

  console.log("Gmail Tracker: New compose window detected. Waiting for toolbar...");
  
  const toolbar = await waitForElement(composeWindow, SELECTORS.toolbar);
  if (!toolbar) {
      console.warn("Gmail Tracker: Toolbar not found after waiting. Skipping injection.");
      return;
  }

  const container = document.createElement('div');
  container.className = 'mt-tracker-toggle-container';
  container.innerHTML = `
    <label class="mt-switch">
      <input type="checkbox" id="mt-track-checkbox" checked>
      <span class="mt-slider round"></span>
    </label>
    <span class="mt-label">Track</span>
  `;

  toolbar.insertBefore(container, toolbar.firstChild);

  const trackingId = generateUUID();
  windowTrackerIds.set(composeWindow, trackingId);
  console.log("Gmail Tracker: Assigned tracking ID", trackingId);

  // 1. Initial Injection
  injectPixel(composeWindow, trackingId);

  // 2. SELF-HEALING: Periodically ensure pixel is still there
  const persistenceInterval = setInterval(() => {
    if (!document.contains(composeWindow)) {
      clearInterval(persistenceInterval);
      return;
    }
    injectPixel(composeWindow, trackingId);
  }, 2000);

  // 3. OBSERVER: Re-inject if body content changes or other extensions wipe it
  const bodyObserver = new MutationObserver(() => {
    injectPixel(composeWindow, trackingId);
  });

  waitForElement(composeWindow, SELECTORS.messageBody).then(body => {
    if (body) {
      bodyObserver.observe(body, { childList: true, subtree: false });
    }
  });

  const attachSendListener = async () => {
    const sendButton = await waitForElement(composeWindow, SELECTORS.sendButton);
    if (sendButton) {
      sendButton.addEventListener('mousedown', () => handleSend(composeWindow), true);
      sendButton.addEventListener('click', () => handleSend(composeWindow), true);
      console.log("Gmail Tracker: Send listeners attached.");
    }
  };
  attachSendListener();

  // FALLBACK: Listen for any click in the compose window
  composeWindow.addEventListener('click', (e) => {
    const target = e.target.closest('[role="button"]');
    if (target && (target.innerText.includes('Send') || target.getAttribute('data-tooltip')?.includes('Send'))) {
      handleSend(composeWindow);
    }
  }, true);

  composeWindow.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSend(composeWindow);
    }
  }, true);
}

async function handleSend(composeWindow) {
  if (composeWindow.dataset.mtSent === 'true') return;
  
  const isTrackEnabled = composeWindow.querySelector('#mt-track-checkbox')?.checked;
  const trackingId = windowTrackerIds.get(composeWindow);
  
  if (isTrackEnabled === false || !trackingId) {
      return;
  }

  // Ensure pixel is there one last time right before send
  await injectPixel(composeWindow, trackingId);

  console.log("Gmail Tracker: Send detected. Registering metadata for ID:", trackingId);
  composeWindow.dataset.mtSent = 'true';

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

  chrome.runtime.sendMessage({ 
    action: "generateId", 
    data: { id: trackingId, subject, recipient } 
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Gmail Tracker: Registration error:", chrome.runtime.lastError);
    }
  });
}

async function injectPixel(composeWindow, id) {
  const isTrackEnabled = composeWindow.querySelector('#mt-track-checkbox')?.checked;
  if (isTrackEnabled === false) return;

  const body = composeWindow.querySelector(SELECTORS.messageBody);
  if (!body) return;

  // If already present, don't re-inject
  if (body.querySelector(`img[data-tracker-id="${id}"]`)) return;

  chrome.runtime.sendMessage({ action: "getSettings" }, (settings) => {
    if (!settings) return;
    const portalUrl = settings.portalUrl || "https://mail-tracker-ten.vercel.app";
    const trackUrl = `${portalUrl}/api/track/${id}?t=${Date.now()}`;
    
    // Double check again inside async
    if (body.querySelector(`img[data-tracker-id="${id}"]`)) return;

    const pixelHtml = `<img src="${trackUrl}" width="1" height="1" style="display:none !important;" data-tracker-id="${id}" />`;
    
    // Insert at the START of the body
    body.insertAdjacentHTML('afterbegin', pixelHtml);
    console.log("Gmail Tracker: Pixel verified/injected.", id);
  });
}

