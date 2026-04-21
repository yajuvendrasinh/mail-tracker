document.addEventListener('DOMContentLoaded', () => {
  const portalUrlInput = document.getElementById('portal-url');
  const viewDashboardBtn = document.getElementById('view-dashboard');

  // Load current settings
  chrome.storage.local.get(['portalUrl'], (data) => {
    if (data.portalUrl) {
      portalUrlInput.value = data.portalUrl;
    }
  });

  // Save settings when input changes
  portalUrlInput.addEventListener('change', () => {
    const url = portalUrlInput.value.trim().replace(/\/$/, ""); // Remove trailing slash
    chrome.storage.local.set({ portalUrl: url }, () => {
      console.log('Settings saved');
    });
  });

  // Open dashboard
  viewDashboardBtn.addEventListener('click', () => {
    const url = portalUrlInput.value || "https://mail-tracker-ten.vercel.app";
    chrome.tabs.create({ url: url });
  });
});
